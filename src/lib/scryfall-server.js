const SCRYFALL_BASE = "https://api.scryfall.com";

const TREATMENT_MAP = {
  nonfoil: "usd",
  foil: "usd_foil",
  etched: "usd_etched",
  glossy: "usd_glossy",
};

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 100;

const cardCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

function getFromCache(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(cache, key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}

async function getCardById(id) {
  const cached = getFromCache(cardCache, id);
  if (cached) return cached;

  try {
    const res = await rateLimitedFetch(`${SCRYFALL_BASE}/cards/${id}`);
    if (!res.ok) return null;
    const card = await res.json();
    setCache(cardCache, id, card);
    return card;
  } catch {
    return null;
  }
}

async function getCardPrice(cardId, treatment) {
  const card = await getCardById(cardId);
  if (!card || !card.prices) return null;

  const priceKey = TREATMENT_MAP[treatment] || "usd";
  const priceStr = card.prices[priceKey];
  if (!priceStr) return null;

  const price = parseFloat(priceStr);
  return isNaN(price) ? null : price;
}

async function getCardPriceAndInfo(cardId, treatment) {
  const card = await getCardById(cardId);
  if (!card || !card.prices) return null;

  const priceKey = TREATMENT_MAP[treatment] || "usd";
  const priceStr = card.prices[priceKey];
  if (!priceStr) return null;

  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return null;

  return {
    price,
    name: card.name,
    set_name: card.set_name,
  };
}

module.exports = {
  getCardPrice,
  getCardPriceAndInfo,
};
