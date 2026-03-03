import { getCardPriceAndInfo } from "./scryfall";
import { validateAndApplyCard } from "./gameLogic";

const QUICK_QUERIES = ["t:basic", "t:land", "usd<=5", "r:common"];
const FETCH_DELAY_MS = 120;

async function fetchCardsFromQuery(
  q: string,
  limit: number
): Promise<Array<{ id: string; name: string; price: number; treatment: string }>> {
  const results: Array<{ id: string; name: string; price: number; treatment: string }> = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints&order=usd&page=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await res.json();
    if (data.data) {
      for (const c of data.data.slice(0, limit)) {
        const priceStr = c.prices?.usd || c.prices?.usd_foil;
        if (priceStr) {
          const price = parseFloat(priceStr);
          if (price > 0 && price <= 100) {
            results.push({
              id: c.id,
              name: c.name,
              price,
              treatment: c.finishes?.includes("nonfoil") ? "nonfoil" : "foil",
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("[AI] Fetch error for", q, e);
  }
  return results;
}

async function getCardsQuick(
  remaining: number,
  usedIds: Set<string>
): Promise<Array<{ id: string; name: string; price: number; treatment: string }>> {
  const seenIds = new Set(usedIds);
  const results: Array<{ id: string; name: string; price: number; treatment: string }> = [];
  const minNeeded = 20;
  for (const q of QUICK_QUERIES) {
    if (results.length >= minNeeded) break;
    const cards = await fetchCardsFromQuery(q, 100);
    for (const c of cards) {
      if (!seenIds.has(c.id) && Math.round(c.price) <= remaining) {
        seenIds.add(c.id);
        results.push(c);
      }
    }
    await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
  }
  return results;
}

async function pickSimple(
  remaining: number,
  usedIds: Set<string>
): Promise<{ id: string; name: string; price: number; treatment: string } | null> {
  const valid = await getCardsQuick(remaining, usedIds);
  console.log("[AI] pickSimple", { remaining, validCount: valid.length, usedIds: usedIds.size });
  if (valid.length === 0) return null;
  return valid[Math.floor(Math.random() * valid.length)];
}

async function pickSmart(
  remaining: number,
  usedIds: Set<string>
): Promise<{ id: string; name: string; price: number; treatment: string } | null> {
  const cards = await getCardsQuick(remaining, usedIds);
  const valid = cards.sort((a, b) => Math.round(b.price) - Math.round(a.price));
  console.log("[AI] pickSmart", { remaining, validCount: valid.length, usedIds: usedIds.size });
  if (valid.length === 0) return null;
  return valid[0];
}

export interface GameStateForAI {
  target: number;
  remaining: number | { "0": number; "1": number };
  playerCards: { "0": unknown[]; "1": unknown[] };
  usedCardIds: string[];
  currentTurn: number;
  status: string;
  winner: number | null;
  lastPlay?: { playerIndex: number; card: { name: string; set: string; treatment: string; price: number } };
}

export async function aiPlay(
  gameState: GameStateForAI,
  difficulty: "simple" | "smart"
): Promise<{ gameState: GameStateForAI } | null> {
  const usedIds = new Set(gameState.usedCardIds || []);
  const remaining = typeof gameState.remaining === "object"
    ? gameState.remaining["1"]
    : gameState.remaining;

  const pick =
    difficulty === "smart"
      ? await pickSmart(remaining, usedIds)
      : await pickSimple(remaining, usedIds);

  if (!pick) return null;

  const cardInfo = await getCardPriceAndInfo(pick.id, pick.treatment);
  if (!cardInfo) return null;

  const result = validateAndApplyCard(
    remaining,
    { id: pick.id, price: cardInfo.price },
    usedIds
  );

  if (!result.valid) return null;

  usedIds.add(pick.id);
  const playerCards = { ...gameState.playerCards };
  playerCards["1"] = [
    ...(playerCards["1"] || []),
    {
      id: pick.id,
      name: cardInfo.name,
      set: cardInfo.set_name,
      treatment: pick.treatment,
      price: result.roundedPrice,
    },
  ];

  const newRemaining = typeof gameState.remaining === "object"
    ? { ...gameState.remaining }
    : { "0": gameState.remaining, "1": gameState.remaining };
  newRemaining["1"] = result.newRemaining!;
  return {
    gameState: {
      ...gameState,
      remaining: newRemaining,
      playerCards,
      currentTurn: result.winner ? 1 : 0,
      status: result.winner ? "finished" : "playing",
      winner: result.winner ? 1 : null,
      usedCardIds: Array.from(usedIds),
      lastPlay: {
        playerIndex: 1,
        card: {
          name: cardInfo.name,
          set: cardInfo.set_name,
          treatment: pick.treatment,
          price: result.roundedPrice!,
        },
      },
    },
  };
}
