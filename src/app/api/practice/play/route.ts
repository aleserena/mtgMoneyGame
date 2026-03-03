import { getCardPriceAndInfo } from "@/lib/scryfall";
import { validateAndApplyCard } from "@/lib/gameLogic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, treatment, gameState } = body;

    if (!cardId || !treatment || !gameState) {
      return NextResponse.json(
        { error: "Missing cardId, treatment, or gameState" },
        { status: 400 }
      );
    }

    const cardInfo = await getCardPriceAndInfo(cardId, treatment);
    if (!cardInfo) {
      return NextResponse.json(
        { error: "Could not fetch card price" },
        { status: 400 }
      );
    }

    const usedIds = new Set<string>(gameState.usedCardIds || []);
    const playerRemaining = typeof gameState.remaining === "object"
      ? gameState.remaining["0"]
      : gameState.remaining;
    const result = validateAndApplyCard(
      playerRemaining,
      { id: cardId, price: cardInfo.price },
      usedIds
    );

    if (!result.valid) {
      const newState = {
        ...gameState,
        currentTurn: 1,
        usedCardIds: Array.from(usedIds),
        remaining: gameState.remaining,
      };
      console.log("[Practice API] User lost turn (overspend)", {
        reason: result.reason,
        newState: { currentTurn: newState.currentTurn, status: newState.status },
      });
      return NextResponse.json({
        error: result.reason,
        gameState: newState,
      });
    }

    usedIds.add(cardId);
    const playerCards = { ...gameState.playerCards };
    playerCards["0"] = [
      ...(playerCards["0"] || []),
      {
        id: cardId,
        name: cardInfo.name,
        set: cardInfo.set_name,
        treatment,
        price: result.roundedPrice!,
      },
    ];

    const prevRemaining = gameState.remaining;
    const remaining: { "0": number; "1": number } =
      typeof prevRemaining === "object"
        ? { ...prevRemaining }
        : { "0": prevRemaining, "1": prevRemaining };
    remaining["0"] = result.newRemaining!;
    const newState = {
      ...gameState,
      remaining,
      playerCards,
      currentTurn: result.winner ? 0 : 1,
      status: result.winner ? "finished" : "playing",
      winner: result.winner ? 0 : null,
      usedCardIds: Array.from(usedIds),
      lastPlay: {
        playerIndex: 0,
        card: {
          name: cardInfo.name,
          set: cardInfo.set_name,
          treatment,
          price: result.roundedPrice!,
        },
      },
    };

    return NextResponse.json({ gameState: newState });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
