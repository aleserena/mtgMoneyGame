"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket";

function randomTarget() {
  return Math.floor(350 + Math.random() * 651);
}

export default function CreateGamePage() {
  const { socket, connected } = useSocket();
  const router = useRouter();
  const [target, setTarget] = useState(500);
  const [useRandom, setUseRandom] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createGame = useCallback(() => {
    if (!socket || !connected) return;
    setCreating(true);
    const t = useRandom ? randomTarget() : Math.min(1000, Math.max(350, target));
    socket.emit("create-game", { target: t }, (res: { roomId?: string; error?: string }) => {
      setCreating(false);
      if (res.roomId) {
        setRoomId(res.roomId);
      }
    });
  }, [socket, connected, target, useRandom]);

  const joinGame = useCallback(() => {
    if (roomId) {
      router.push(`/game/${roomId}`);
    }
  }, [roomId, router]);

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Create Game</h1>
      {!roomId ? (
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
          <button
            onClick={createGame}
            disabled={!connected || creating}
            className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium"
          >
            {creating ? "Creating..." : connected ? "Create Game" : "Connecting..."}
          </button>
        </div>
      ) : (
        <div className="space-y-4 w-full max-w-sm text-center">
          <p className="text-slate-400">Share this link with your opponent:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={typeof window !== "undefined" ? `${window.location.origin}/game/${roomId}` : ""}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm"
            />
            <button
              onClick={() => window.navigator.clipboard?.writeText(`${window.location.origin}/game/${roomId}`)}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
            >
              Copy
            </button>
          </div>
          <button
            onClick={joinGame}
            className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium"
          >
            Join Game
          </button>
        </div>
      )}
      <a href="/" className="mt-8 text-slate-400 hover:text-white">
        Back
      </a>
    </main>
  );
}
