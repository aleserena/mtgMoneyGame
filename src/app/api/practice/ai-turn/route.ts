import { aiPlay } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameState, difficulty } = body;

    if (!gameState) {
      console.log("[Practice AI] Missing gameState");
      return NextResponse.json(
        { error: "Missing gameState" },
        { status: 400 }
      );
    }

    console.log("[Practice AI] AI turn requested", {
      difficulty: difficulty || "simple",
      remaining: gameState.remaining,
      currentTurn: gameState.currentTurn,
    });

    const result = await aiPlay(gameState, difficulty || "simple");
    if (!result) {
      console.warn("[Practice AI] Could not find a valid play");
      return NextResponse.json(
        { error: "AI could not find a valid play" },
        { status: 400 }
      );
    }

    console.log("[Practice AI] AI played successfully", {
      newRemaining: result.gameState.remaining,
      winner: result.gameState.winner,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
