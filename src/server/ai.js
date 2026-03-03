const { getCardPriceAndInfo } = require("../lib/scryfall-server");
const { validateAndApplyCard } = require("../lib/gameLogic");

// Search for cheap staples - these typically have low, stable prices
const SEARCH_QUERIES = [
  "t:basic",
  "e:m21 r:common",
  "e:iko r:common",
  "e:znr r:common",
];

let cachedCards = [];
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function getCardPool() {
  if (cachedCards.length > 0 && Date.now() - lastCacheTime < CACHE_TTL_MS) {
    return cachedCards;
  }
  const results = [];
  for (const q of SEARCH_QUERIES) {
    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints&order=usd`
      );
      const data = await res.json();
      if (data.data) {
        for (const c of data.data.slice(0, 10)) {
          const priceStr = c.prices?.usd || c.prices?.usd_foil;
          if (priceStr) {
            const price = parseFloat(priceStr);
            if (price > 0 && price < 20) {
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
      console.error("AI pool fetch error:", e);
    }
  }
  if (results.length > 0) {
    cachedCards = results;
    lastCacheTime = Date.now();
  }
  return cachedCards;
}

async function pickSimple(remaining, usedIds) {
  const pool = await getCardPool();
  const valid = pool.filter(
    (c) => !usedIds.has(c.id) && Math.round(c.price) <= remaining
  );
  if (valid.length === 0) return null;
  return valid[Math.floor(Math.random() * valid.length)];
}

async function pickSmart(remaining, usedIds) {
  const pool = await getCardPool();
  const valid = pool
    .filter((c) => !usedIds.has(c.id) && Math.round(c.price) <= remaining)
    .sort((a, b) => Math.round(b.price) - Math.round(a.price));
  if (valid.length === 0) return null;
  return valid[0];
}

async function aiPlay(gameState, difficulty) {
  const usedIds = new Set(gameState.usedCardIds || []);
  const remaining = gameState.remaining;

  const pick = difficulty === "smart"
    ? await pickSmart(remaining, usedIds)
    : await pickSimple(remaining, usedIds);

  if (!pick) return null;

  const cardInfo = await getCardPriceAndInfo(pick.id, pick.treatment || "nonfoil");
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
      treatment: pick.treatment || "nonfoil",
      price: result.roundedPrice,
    },
  ];

  return {
    gameState: {
      ...gameState,
      remaining: result.newRemaining,
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
          treatment: pick.treatment || "nonfoil",
          price: result.roundedPrice,
        },
      },
    },
  };
}

module.exports = { aiPlay };
