const SCRYFALL_BASE = "https://api.scryfall.com";

const TREATMENT_MAP = {
  nonfoil: "usd",
  foil: "usd_foil",
  etched: "usd_etched",
  glossy: "usd_glossy",
};

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 100;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

async function getCardById(id) {
  const res = await rateLimitedFetch(`${SCRYFALL_BASE}/cards/${id}`);
  if (!res.ok) return null;
  return res.json();
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
