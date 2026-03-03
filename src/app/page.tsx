import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">MTG Money Game</h1>
      <p className="text-slate-400 mb-12 text-center max-w-md">
        Name Magic cards to subtract their prices. Reach exactly $0 to win!
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/practice"
          className="px-6 py-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-center transition-colors"
        >
          Practice Mode
        </Link>
        <Link
          href="/create"
          className="px-6 py-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-center transition-colors"
        >
          Create Game (Share Link)
        </Link>
        <Link
          href="/matchmaking"
          className="px-6 py-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-center transition-colors"
        >
          Find Opponent (Random)
        </Link>
      </div>
    </main>
  );
}
