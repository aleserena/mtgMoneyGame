"use client";

import { useCallback, useEffect, useState } from "react";
import { GameBoard } from "@/components/GameBoard";

function randomTarget() {
  return Math.floor(350 + Math.random() * 651);
}

const createInitialState = (target: number) => ({
  target,
  remaining: { "0": target, "1": target },
  playerCards: { "0": [] as Array<{ id: string; name: string; set: string; treatment: string; price: number }>, "1": [] as Array<{ id: string; name: string; set: string; treatment: string; price: number }> },
  currentTurn: 0,
  status: "playing",
  winner: null as number | null,
  usedCardIds: [] as string[],
});

export default function PracticePage() {
  const [target, setTarget] = useState(500);
  const [useRandom, setUseRandom] = useState(true);
  const [gameState, setGameState] = useState(createInitialState(500));
  const [aiDifficulty, setAiDifficulty] = useState<"simple" | "smart">("simple");
  const [started, setStarted] = useState(false);
  const [loseTurnMessage, setLoseTurnMessage] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const startGame = useCallback(() => {
    const t = useRandom ? randomTarget() : Math.min(1000, Math.max(350, target));
    setTarget(t);
    setGameState(createInitialState(t));
    setStarted(true);
    setLoseTurnMessage(null);
  }, [target, useRandom]);

  const playCard = useCallback(
    async (cardId: string, treatment: string) => {
      console.log("[Practice] playCard called", { cardId, treatment, gameState });
      const res = await fetch("/api/practice/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          treatment,
          gameState,
        }),
      });
      const data = await res.json();
      console.log("[Practice] play API response", { error: data.error, gameState: data.gameState });

      if (data.error) {
        setLoseTurnMessage(data.error);
        const newState = data.gameState || gameState;
        setGameState(newState);
        console.log("[Practice] User lost turn, switching to AI", { currentTurn: newState?.currentTurn });
        if (newState?.currentTurn === 1 && newState?.status !== "finished") {
          setAiThinking(true);
          try {
            const aiRes = await fetch("/api/practice/ai-turn", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gameState: newState,
                difficulty: aiDifficulty,
              }),
            });
            const aiData = await aiRes.json();
            console.log("[Practice] AI turn response", aiData);
            if (aiData.gameState) {
              setGameState(aiData.gameState);
            } else {
              console.warn("[Practice] AI could not find a valid play");
            }
          } finally {
            setAiThinking(false);
          }
        }
        return;
      }

      setLoseTurnMessage(null);
      setGameState(data.gameState);

      if (data.gameState.status !== "finished" && data.gameState.currentTurn === 1) {
        console.log("[Practice] Triggering AI turn after user play");
        setAiThinking(true);
        try {
          const aiRes = await fetch("/api/practice/ai-turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameState: data.gameState,
              difficulty: aiDifficulty,
            }),
          });
          const aiData = await aiRes.json();
          console.log("[Practice] AI turn response", aiData);
          if (aiData.gameState) {
            setGameState(aiData.gameState);
          } else {
            console.warn("[Practice] AI could not find a valid play");
          }
        } finally {
          setAiThinking(false);
        }
      }
    },
    [gameState, aiDifficulty]
  );

  if (!started) {
    return (
      <main className="min-h-screen p-8 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-6">Practice Mode</h1>
        <div className="space-y-4 w-full max-w-sm">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="random-target"
              checked={useRandom}
              onChange={(e) => setUseRandom(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="random-target" className="text-sm text-slate-400">
              Random target amount ($350–$1000)
            </label>
          </div>
          {!useRandom && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Target amount ($350–$1000)</label>
              <input
                type="number"
                min={350}
                max={1000}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-400 mb-1">AI difficulty</label>
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value as "simple" | "smart")}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            >
              <option value="simple">Simple (random valid cards)</option>
              <option value="smart">Smart (strategic picks)</option>
            </select>
          </div>
          <button
            onClick={startGame}
            className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium"
          >
            Start Game
          </button>
        </div>
        <a href="/" className="mt-8 text-slate-400 hover:text-white">
          Back
        </a>
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
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300">
            {loseTurnMessage}
          </div>
        )}
        {aiThinking && (
          <div className="mb-4 p-3 rounded-lg bg-slate-700 text-slate-300">
            AI is thinking...
          </div>
        )}
        <GameBoard
          gameState={gameState}
          currentPlayerIndex={0}
          onPlayCard={playCard}
          isMultiplayer={false}
        />
      </div>
    </main>
  );
}
