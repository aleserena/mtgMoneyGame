"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket";
import { DEFAULT_TARGET, TARGET_MIN, TARGET_MAX } from "@/lib/config";

export default function MatchmakingPage() {
  const { socket, connected } = useSocket();
  const router = useRouter();
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [useRandom, setUseRandom] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onMatched = (res: { roomId?: string }) => {
      setSearching(false);
      if (res.roomId) {
        router.push(`/game/${res.roomId}`);
      }
    };
    socket.on("matched", onMatched);
    return () => {
      socket.off("matched", onMatched);
    };
  }, [socket, router]);

  const findOpponent = useCallback(() => {
    if (!socket || !connected) return;
    setSearching(true);
    const config = useRandom
      ? { random: true }
      : { target: Math.min(TARGET_MAX, Math.max(TARGET_MIN, target)) };
    socket.emit("join-queue", config, (res: { matched?: boolean; roomId?: string; playerIndex?: number }) => {
      if (res.matched && res.roomId) {
        setSearching(false);
        router.push(`/game/${res.roomId}`);
      }
    });
  }, [socket, connected, target, useRandom, router]);

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Find Opponent</h1>
      <div className="space-y-4 w-full max-w-sm">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="random-target"
            checked={useRandom}
            onChange={(e) => setUseRandom(e.target.checked)}
            disabled={searching}
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
              disabled={searching}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            />
          </div>
        )}
        <button
          onClick={findOpponent}
          disabled={!connected || searching}
          className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium"
        >
          {searching ? "Searching..." : connected ? "Find Opponent" : "Connecting..."}
        </button>
      </div>
      <a href="/" className="mt-8 text-slate-400 hover:text-white">
        Back
      </a>
    </main>
  );
}
