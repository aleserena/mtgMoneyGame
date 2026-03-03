const queue = new Map();
const logger = require("./logger");

function addToQueue(socketId, config) {
  queue.set(socketId, { config, joinedAt: Date.now() });
  logger.info("queue_joined", { socketId, config });
}

function removeFromQueue(socketId) {
  if (queue.delete(socketId)) {
    logger.info("queue_left", { socketId });
  }
}

function randomTarget() {
  return Math.floor(350 + Math.random() * 651);
}

function findMatch(socketId) {
  const entry = queue.get(socketId);
  if (!entry) return null;

  const isRandom = entry.config?.random === true;
  const target = isRandom ? randomTarget() : Math.min(1000, Math.max(350, entry.config?.target ?? 500));

  for (const [otherId, otherEntry] of queue) {
    if (otherId === socketId) continue;
    const otherIsRandom = otherEntry.config?.random === true;
    const otherTarget = otherIsRandom ? randomTarget() : Math.min(1000, Math.max(350, otherEntry.config?.target ?? 500));
    const matchTarget = isRandom && otherIsRandom ? randomTarget() : Math.round((target + otherTarget) / 2);
    if ((isRandom && otherIsRandom) || Math.abs(target - otherTarget) <= 100) {
      queue.delete(socketId);
      queue.delete(otherId);
      logger.info("queue_matched", {
        socketId,
        otherId,
        target: matchTarget,
      });
      return { otherId, target: matchTarget };
    }
  }
  return null;
}

function setupMatchmakingHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join-queue", (config, callback) => {
      addToQueue(socket.id, config);
      const match = findMatch(socket.id);
      if (match) {
        const { createRoom } = require("./gameManager");
        const roomId = createRoom({ target: match.target });
        const otherSocket = io.sockets.sockets.get(match.otherId);
        if (otherSocket) {
          otherSocket.join(roomId);
          otherSocket.emit("matched", { roomId, playerIndex: 0 });
        }
        socket.join(roomId);
        socket.emit("matched", { roomId, playerIndex: 1 });
        logger.info("queue_match_room_created", {
          roomId,
          socketId: socket.id,
          otherSocketId: match.otherId,
        });
        callback({ matched: true, roomId, playerIndex: 1 });
      } else {
        callback({ matched: false });
      }
    });

    socket.on("leave-queue", () => {
      removeFromQueue(socket.id);
    });

    socket.on("disconnect", () => {
      removeFromQueue(socket.id);
    });
  });
}

module.exports = {
  setupMatchmakingHandlers,
  queue,
};
