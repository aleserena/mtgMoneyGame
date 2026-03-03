import { describe, expect, it, beforeEach } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const gameManager = require("./gameManager");

const { createRoom, joinRoom, rooms } = gameManager;

describe("gameManager room lifecycle", () => {
  beforeEach(() => {
    // Clear rooms between tests
    for (const key of rooms.keys()) {
      rooms.delete(key);
    }
  });

  it("creates a room and allows two players to join", () => {
    const roomId = createRoom({ target: 500 });
    expect(roomId).toBeTruthy();

    const first = joinRoom(roomId, "player-1");
    expect(first.error).toBeUndefined();
    expect(first.playerIndex).toBe(0);

    const second = joinRoom(roomId, "player-2");
    expect(second.error).toBeUndefined();
    expect(second.playerIndex).toBe(1);

    const room = rooms.get(roomId);
    expect(room.players).toHaveLength(2);
    expect(room.status).toBe("playing");
  });

  it("prevents a third distinct player from joining", () => {
    const roomId = createRoom({ target: 500 });
    joinRoom(roomId, "player-1");
    joinRoom(roomId, "player-2");

    const third = joinRoom(roomId, "player-3");
    expect(third.error).toBe("Room full");
  });

  it("allows a player to rejoin their existing seat", () => {
    const roomId = createRoom({ target: 500 });
    const first = joinRoom(roomId, "player-1");
    expect(first.playerIndex).toBe(0);

    const rejoin = joinRoom(roomId, "player-1");
    expect(rejoin.error).toBeUndefined();
    expect(rejoin.playerIndex).toBe(0);
    expect(rejoin.rejoined).toBe(true);
  });
});

