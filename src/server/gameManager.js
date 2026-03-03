const { randomBytes } = require("crypto");
const { getCardPriceAndInfo } = require("../lib/scryfall-server");
const { validateAndApplyCard } = require("../lib/gameLogic");

const rooms = new Map();

function generateRoomId() {
  return randomBytes(4).toString("hex");
}

function createRoom(config) {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    target: config.target,
    remaining: { "0": config.target, "1": config.target },
    usedCardIds: new Set(),
    playerCards: { "0": [], "1": [] },
    players: [],
    currentTurn: 0,
    status: "waiting",
    winner: null,
    lastPlay: null,
  };
  rooms.set(roomId, room);
  return roomId;
}

function joinRoom(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found" };
  if (room.players.length >= 2) return { error: "Room full" };

  const playerIndex = room.players.length;
  room.players.push({ id: playerId, index: playerIndex });

  if (room.players.length === 2) {
    room.status = "playing";
  }

  return { room, playerIndex };
}

async function playCard(roomId, playerId, { cardId, treatment }) {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found" };
  if (room.status !== "playing") return { error: "Game not in progress" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Not in this room" };
  if (room.currentTurn !== player.index) return { error: "Not your turn" };

  const cardInfo = await getCardPriceAndInfo(cardId, treatment);
  if (cardInfo === null) return { error: "Could not fetch card price" };

  const playerRemaining = room.remaining[player.index];
  const result = validateAndApplyCard(
    playerRemaining,
    { id: cardId, price: cardInfo.price },
    room.usedCardIds
  );

  if (!result.valid) {
    room.currentTurn = room.currentTurn === 0 ? 1 : 0;
    return {
      success: false,
      loseTurn: true,
      reason: result.reason,
      gameState: getGameState(room),
    };
  }

  room.usedCardIds.add(cardId);
  room.remaining[player.index] = result.newRemaining;
  room.playerCards[player.index].push({
    id: cardId,
    name: cardInfo.name,
    set: cardInfo.set_name,
    treatment,
    price: result.roundedPrice,
  });

  if (result.winner) {
    room.status = "finished";
    room.winner = player.index;
  } else {
    room.currentTurn = room.currentTurn === 0 ? 1 : 0;
  }

  room.lastPlay = { playerIndex: player.index, card: room.playerCards[player.index].at(-1) };

  return {
    success: true,
    gameState: getGameState(room),
  };
}

function getGameState(room) {
  return {
    target: room.target,
    remaining: room.remaining,
    playerCards: room.playerCards,
    currentTurn: room.currentTurn,
    status: room.status,
    winner: room.winner,
    lastPlay: room.lastPlay,
  };
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function setupGameHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms) {
        const player = room.players.find((p) => p.id === socket.id);
        if (player && room.status === "playing") {
          room.status = "finished";
          room.winner = player.index === 0 ? 1 : 0;
          io.to(roomId).emit("game-state", getGameState(room));
          io.to(roomId).emit("opponent-disconnected", {});
          break;
        }
      }
    });

    socket.on("create-game", (config, callback) => {
      const target = Math.min(1000, Math.max(350, config?.target ?? 500));
      const roomId = createRoom({ target });
      callback({ roomId });
    });

    socket.on("join-game", (roomId, callback) => {
      const result = joinRoom(roomId, socket.id);
      if (result.error) {
        callback({ error: result.error });
        return;
      }
      socket.join(roomId);
      callback({ room: result.room, playerIndex: result.playerIndex, gameState: getGameState(result.room) });
      if (result.room.status === "playing") {
        io.to(roomId).emit("game-state", getGameState(result.room));
      }
    });

    socket.on("play-card", async (data, callback) => {
      const { roomId, cardId, treatment } = data;
      if (!roomId || !cardId || !treatment) {
        callback({ error: "Missing roomId, cardId, or treatment" });
        return;
      }
      const result = await playCard(roomId, socket.id, { cardId, treatment });
      if (result.error) {
        callback({ error: result.error });
        return;
      }
      io.to(roomId).emit("game-state", result.gameState);
      if (result.loseTurn) {
        io.to(roomId).emit("lose-turn", { reason: result.reason });
      }
      callback(result);
    });
  });
}

module.exports = {
  createRoom,
  joinRoom,
  playCard,
  getRoom,
  getGameState,
  setupGameHandlers,
  rooms,
};
