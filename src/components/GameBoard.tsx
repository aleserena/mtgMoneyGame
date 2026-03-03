"use client";

import { CardSearch } from "./CardSearch";
import { PlayerCardList } from "./PlayerCardList";

export interface GameState {
  target: number;
  remaining: number | { "0": number; "1": number };
  playerCards: {
    "0": Array<{ id: string; name: string; set: string; treatment: string; price: number; notCounted?: boolean }>;
    "1": Array<{ id: string; name: string; set: string; treatment: string; price: number; notCounted?: boolean }>;
  };
  currentTurn: number;
  status: string;
  winner: number | null;
  lastPlay?: { playerIndex: number; card: { name: string; set: string; treatment: string; price: number } };
}

interface GameBoardProps {
  gameState: GameState;
  currentPlayerIndex: number;
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
          <p className="text-slate-400">
            {isMyTurn ? "Your turn — pick a card" : isMultiplayer ? "Waiting for opponent..." : "AI is thinking..."}
          </p>
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
