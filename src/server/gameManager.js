const { randomBytes } = require("crypto");
const { getCardPriceAndInfo } = require("../lib/scryfall-server");
const { validateAndApplyCard } = require("../lib/gameLogic");
const logger = require("./logger");

const rooms = new Map();

const ROOM_TTL_MS = 30 * 60 * 1000; // 30 minutes
const REJOIN_GRACE_MS = 2 * 60 * 1000; // 2 minutes

function generateRoomId() {
  return randomBytes(4).toString("hex");
}

function touchRoom(room) {
  room.lastActivity = Date.now();
}

function createRoom(config) {
  const roomId = generateRoomId();
  const now = Date.now();
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
    lastActivity: now,
    disconnectTimer: null,
  };
  rooms.set(roomId, room);
  logger.info("room_created", { roomId, target: config.target });
  return roomId;
}

function joinRoom(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found" };

  // Rejoin existing seat if this player was already in the room.
  const existing = room.players.find((p) => p.id === playerId);
  if (existing) {
    existing.disconnectedAt = null;
    touchRoom(room);
    if (
      room.disconnectTimer &&
      !room.players.some((p) => p.disconnectedAt != null)
    ) {
      clearTimeout(room.disconnectTimer);
      room.disconnectTimer = null;
    }
    logger.info("player_rejoined_room", {
      roomId,
      playerId,
      playerIndex: existing.index,
    });
    return { room, playerIndex: existing.index, rejoined: true };
  }

  if (room.players.length >= 2) return { error: "Room full" };

  const playerIndex = room.players.length;
  room.players.push({ id: playerId, index: playerIndex, disconnectedAt: null });

  if (room.players.length === 2) {
    room.status = "playing";
  }

  touchRoom(room);
  logger.info("player_joined_room", { roomId, playerId, playerIndex });
  return { room, playerIndex };
}

async function playCard(roomId, playerId, { cardId, treatment }) {
  const room = rooms.get(roomId);
  if (!room) {
    return { error: "Room not found" };
  }
  if (room.status !== "playing") {
    return { error: "Game not in progress" };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Not in this room" };
  if (room.currentTurn !== player.index) return { error: "Not your turn" };

  const cardInfo = await getCardPriceAndInfo(cardId, treatment);
  if (cardInfo === null) {
    logger.warn("card_price_fetch_failed", { roomId, playerId, cardId, treatment });
    return { error: "Could not fetch card price" };
  }

  const playerRemaining = room.remaining[player.index];
  const result = validateAndApplyCard(
    playerRemaining,
    { id: cardId, price: cardInfo.price },
    room.usedCardIds
  );

  if (!result.valid) {
    // If the only problem is overspending, keep the card in the player's list but mark it as not counted
    if (result.overspend) {
      const roundedPrice = Math.round(cardInfo.price);
      room.playerCards[player.index].push({
        id: cardId,
        name: cardInfo.name,
        set: cardInfo.set_name,
        treatment,
        price: roundedPrice,
        notCounted: true,
      });
      room.lastPlay = {
        playerIndex: player.index,
        card: room.playerCards[player.index].at(-1),
      };

      room.currentTurn = room.currentTurn === 0 ? 1 : 0;
      touchRoom(room);
      logger.info("invalid_play_lose_turn", {
        roomId,
        playerId,
        cardId,
        treatment,
        reason: result.reason,
      });
      return {
        success: false,
        loseTurn: true,
        reason: result.reason,
        gameState: getGameState(room),
      };
    }

    // For other invalid reasons (e.g. no valid price, already used),
    // do not change turn or game state – just surface the error.
    logger.info("invalid_play_no_turn_loss", {
      roomId,
      playerId,
      cardId,
      treatment,
      reason: result.reason,
    });
    return {
      success: false,
      loseTurn: false,
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

  touchRoom(room);
  logger.info("card_played", {
    roomId,
    playerId,
    cardId,
    treatment,
    price: result.roundedPrice,
    remaining: room.remaining[player.index],
    winner: room.winner,
  });

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

function cleanupRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    const last = room.lastActivity || 0;
    if (now - last > ROOM_TTL_MS) {
      if (room.disconnectTimer) {
        clearTimeout(room.disconnectTimer);
      }
      rooms.delete(roomId);
    }
  }
}

function setupGameHandlers(io) {
  // Periodic cleanup to avoid leaking inactive rooms.
  setInterval(cleanupRooms, ROOM_TTL_MS);

  io.on("connection", (socket) => {
    const playerId =
      (socket.handshake && socket.handshake.auth && socket.handshake.auth.playerId) ||
      socket.id;
    socket.data.playerId = playerId;
    logger.info("socket_connected", { socketId: socket.id, playerId });

    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms) {
        const player = room.players.find((p) => p.id === playerId);
        if (!player || room.status !== "playing") continue;

        player.disconnectedAt = Date.now();
        touchRoom(room);

        // Inform the remaining player that their opponent disconnected,
        // but allow a grace period for reconnection before declaring a forfeit.
        io.to(roomId).emit("opponent-disconnected", {
          rejoinWindowMs: REJOIN_GRACE_MS,
        });

        if (!room.disconnectTimer) {
          room.disconnectTimer = setTimeout(() => {
            const stillDisconnected = room.players.find(
              (p) => p.disconnectedAt != null
            );
            if (stillDisconnected && room.status === "playing") {
              room.status = "finished";
              room.winner = stillDisconnected.index === 0 ? 1 : 0;
              io.to(roomId).emit("game-state", getGameState(room));
              io.to(roomId).emit("opponent-disconnected", {
                forfeited: true,
              });
              logger.info("player_forfeited_due_to_disconnect", {
                roomId,
                playerId: stillDisconnected.id,
                winner: room.winner,
              });
            }
          }, REJOIN_GRACE_MS);
        }
        break;
      }
    });

    socket.on("create-game", (config, callback) => {
      const target = Math.min(1000, Math.max(350, config?.target ?? 500));
      const roomId = createRoom({ target });
      callback({ roomId });
    });

    socket.on("join-game", (roomId, callback) => {
      const result = joinRoom(roomId, playerId);
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
      const result = await playCard(roomId, playerId, { cardId, treatment });
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
