"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket";
import { GameBoard } from "@/components/GameBoard";
import type { GameState, PlayerIndex } from "@/lib/types";

const INITIAL_STATE: GameState = {
  target: 0,
  remaining: 0,
  playerCards: { "0": [], "1": [] },
  currentTurn: 0,
  status: "waiting",
  winner: null,
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { socket, connected } = useSocket();
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [playerIndex, setPlayerIndex] = useState<PlayerIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loseTurnMessage, setLoseTurnMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    socket.emit("join-game", roomId, (res: { room?: unknown; playerIndex?: number; gameState?: GameState; error?: string }) => {
      if (res.error) {
        setError(res.error);
        return;
      }
      const idx = (res.playerIndex ?? 0) as PlayerIndex;
      setPlayerIndex(idx);
      if (res.gameState) {
        setGameState(res.gameState);
      }
    });

    socket.on("game-state", (state: GameState) => {
      setGameState(state);
      setLoseTurnMessage(null);
    });

    socket.on("lose-turn", (data: { reason?: string }) => {
      setLoseTurnMessage(data.reason || "You lost your turn");
    });

    socket.on(
      "opponent-disconnected",
      (data?: { forfeited?: boolean; rejoinWindowMs?: number }) => {
        if (data?.forfeited) {
          setError("Opponent disconnected and forfeited the game. You win!");
        } else {
          setError("Opponent disconnected. Waiting to see if they reconnect...");
        }
      }
    );

    return () => {
      socket.off("game-state");
      socket.off("lose-turn");
      socket.off("opponent-disconnected");
    };
  }, [socket, connected, roomId]);

  const playCard = useCallback(
    (cardId: string, treatment: string) => {
      if (!socket || playerIndex === null) return;
      socket.emit(
        "play-card",
        { roomId, cardId, treatment },
        (res: { success?: boolean; error?: string; loseTurn?: boolean; reason?: string }) => {
          if (res.error) {
            setLoseTurnMessage(res.error);
          }
          if (res.loseTurn && res.reason) {
            setLoseTurnMessage(res.reason);
          }
        }
      );
    },
    [socket, roomId, playerIndex]
  );

  if (error) {
    return (
      <main className="min-h-screen p-8 flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error}</p>
        <a href="/" className="text-slate-400 hover:text-white">Back</a>
      </main>
    );
  }

  if (playerIndex === null && !error) {
    return (
      <main className="min-h-screen p-8 flex flex-col items-center justify-center">
        <p className="text-slate-400">Joining game...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-slate-400 hover:text-white mb-4 inline-block">
          Back
        </a>
        {loseTurnMessage && (
          <div
            className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300"
            role="status"
            aria-live="polite"
          >
            {loseTurnMessage}
          </div>
        )}
        <GameBoard
          gameState={gameState}
          currentPlayerIndex={(playerIndex ?? 0) as PlayerIndex}
          onPlayCard={playCard}
          isMultiplayer={true}
        />
      </div>
    </main>
  );
}
