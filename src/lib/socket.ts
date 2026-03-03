"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

const PLAYER_ID_STORAGE_KEY = "mtg_money_game_player_id";

function createPlayerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  return `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function getOrCreatePlayerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existing) return existing;
    const id = createPlayerId();
    window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return null;
  }
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const id = getOrCreatePlayerId();
    setPlayerId(id);
  }, []);

  useEffect(() => {
    if (!playerId) return;

    const s: Socket = io({
      path: "/socket.io",
      auth: { playerId },
    });

    setStatus("connecting");

    s.on("connect", () => {
      setConnected(true);
      setStatus("connected");
    });
    s.on("disconnect", () => {
      setConnected(false);
      setStatus("disconnected");
    });

    s.io.on("reconnect_attempt", () => {
      setStatus("reconnecting");
    });
    s.io.on("reconnect", () => {
      setConnected(true);
      setStatus("connected");
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [playerId]);

  return { socket, connected, status, playerId };
}
