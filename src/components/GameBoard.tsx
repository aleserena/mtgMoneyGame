"use client";

import { CardSearch } from "./CardSearch";
import { PlayerCardList } from "./PlayerCardList";
import type { GameState, PlayerIndex } from "@/lib/types";

interface GameBoardProps {
  gameState: GameState;
  currentPlayerIndex: PlayerIndex;
  onPlayCard: (cardId: string, treatment: string) => void;
  isMultiplayer?: boolean;
}

export function GameBoard({
  gameState,
  currentPlayerIndex,
  onPlayCard,
  isMultiplayer = false,
}: GameBoardProps) {
  const isMyTurn = gameState.currentTurn === currentPlayerIndex;
  const gameOver = gameState.status === "finished";
  const turnMessage = gameOver
    ? gameState.winner === currentPlayerIndex
      ? "Game over — you win!"
      : "Game over — you lose."
    : isMyTurn
    ? "Your turn — pick a card."
    : isMultiplayer
    ? "Waiting for opponent..."
    : "AI is thinking...";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        className="rounded-lg bg-slate-900/40 border border-slate-700 p-3 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-slate-300">{turnMessage}</p>
      </div>
      <p className="text-center text-slate-400 text-sm">Target: ${gameState.target}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4 text-center">
          <p className="text-slate-400 text-sm">
            {currentPlayerIndex === 0 ? "Your" : "Opponent's"} remaining
          </p>
          <p className="text-2xl font-mono font-bold text-white">
            ${typeof gameState.remaining === "object" ? gameState.remaining["0"] : gameState.remaining}
          </p>
        </div>
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4 text-center">
          <p className="text-slate-400 text-sm">
            {currentPlayerIndex === 1 ? "Your" : "Opponent's"} remaining
          </p>
          <p className="text-2xl font-mono font-bold text-white">
            ${typeof gameState.remaining === "object" ? gameState.remaining["1"] : gameState.remaining}
          </p>
        </div>
      </div>

      {gameState.lastPlay && (
        <div className="text-center text-sm text-slate-500">
          Last play: {gameState.lastPlay.card.name} (${gameState.lastPlay.card.price})
        </div>
      )}

      {gameOver ? (
        <div className="text-center py-8 rounded-lg bg-slate-800">
          <p className="text-xl font-bold text-amber-400">
            {gameState.winner === currentPlayerIndex ? "You win!" : "You lose!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {isMyTurn && (
            <CardSearch onSelect={onPlayCard} disabled={gameOver} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlayerCardList
          cards={gameState.playerCards["0"]}
          label={currentPlayerIndex === 0 ? "Your cards" : "Opponent's cards"}
        />
        <PlayerCardList
          cards={gameState.playerCards["1"]}
          label={currentPlayerIndex === 1 ? "Your cards" : "Opponent's cards"}
        />
      </div>
    </div>
  );
}
