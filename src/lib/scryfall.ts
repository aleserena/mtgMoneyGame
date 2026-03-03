import {
  SCRYFALL_BASE_URL,
  SCRYFALL_MIN_INTERVAL_MS,
  SCRYFALL_CACHE_TTL_MS,
} from "./config";

const TREATMENT_MAP: Record<string, keyof ScryfallPrices> = {
  nonfoil: "usd",
  foil: "usd_foil",
  etched: "usd_etched",
  glossy: "usd_glossy",
};

interface ScryfallPrices {
  usd: string | null;
  usd_foil: string | null;
  usd_etched?: string | null;
  usd_glossy?: string | null;
}

export interface ScryfallCard {
  id: string;
  name: string;
  set_name: string;
  set: string;
  collector_number?: string;
  finishes?: string[];
  frame_effects?: string[];
  promo?: boolean;
  promo_types?: string[];
  prices: ScryfallPrices;
}

type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

const autocompleteCache = new Map<string, CacheEntry<string[]>>();
const searchCache = new Map<string, CacheEntry<PrintingInfo[]>>();
const cardCache = new Map<string, CacheEntry<ScryfallCard>>();

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < SCRYFALL_MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, SCRYFALL_MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SCRYFALL_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, { value, timestamp: Date.now() });
}

export async function autocomplete(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  const cacheKey = query.toLowerCase();
  const cached = getFromCache(autocompleteCache, cacheKey);
  if (cached) return cached;

  try {
    const res = await rateLimitedFetch(
      `${SCRYFALL_BASE_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const names: string[] = data.data || [];
    setCache(autocompleteCache, cacheKey, names);
    return names;
  } catch {
    return [];
  }
}

export interface PrintingInfo {
  id: string;
  name: string;
  set_name: string;
  set: string;
  collector_number?: string;
  finishes: string[];
  frame_effects?: string[];
  promo?: boolean;
  promo_types?: string[];
}

export async function searchCards(query: string): Promise<PrintingInfo[]> {
  if (!query || query.length < 2) return [];
  const cacheKey = query.toLowerCase();
  const cached = getFromCache(searchCache, cacheKey);
  if (cached) return cached;

  try {
    const res = await rateLimitedFetch(
      `${SCRYFALL_BASE_URL}/cards/search?q=${encodeURIComponent(query)}&unique=prints`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.object === "error") return [];
    const cards: ScryfallCard[] = data.data || [];
    const FINISH_TO_PRICE: Record<string, keyof ScryfallPrices> = {
      nonfoil: "usd",
      foil: "usd_foil",
      etched: "usd_etched",
      glossy: "usd_glossy",
    };
    const printings = cards
      .map((c) => {
        if (!c.prices) return null;
        const rawFinishes = c.finishes || ["nonfoil"];
        const validFinishes = rawFinishes.filter((f) => {
          const priceKey = FINISH_TO_PRICE[f] || "usd";
          const priceStr = c.prices[priceKey as keyof ScryfallPrices];
          if (!priceStr) return false;
          const price = parseFloat(priceStr);
          // Require a positive price; rounding logic will treat
          // prices below $1 as costing $1 in gameplay.
          return !isNaN(price) && price > 0;
        });
        if (validFinishes.length === 0) return null;
        return {
          id: c.id,
          name: c.name,
          set_name: c.set_name,
          set: c.set,
          collector_number: c.collector_number,
          finishes: validFinishes,
          frame_effects: c.frame_effects,
          promo: c.promo,
          promo_types: c.promo_types,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    setCache(searchCache, cacheKey, printings);
    return printings;
  } catch {
    return [];
  }
}

export async function getCardById(id: string): Promise<ScryfallCard | null> {
  const cached = getFromCache(cardCache, id);
  if (cached) return cached;

  try {
    const res = await rateLimitedFetch(`${SCRYFALL_BASE_URL}/cards/${id}`);
    if (!res.ok) return null;
    const card: ScryfallCard = await res.json();
    setCache(cardCache, id, card);
    return card;
  } catch {
    return null;
  }
}

export async function getCardPrice(
  cardId: string,
  treatment: string
): Promise<number | null> {
  const card = await getCardById(cardId);
  if (!card || !card.prices) return null;

  const priceKey = TREATMENT_MAP[treatment] || "usd";
  const priceStr = card.prices[priceKey as keyof ScryfallPrices];
  if (!priceStr) return null;

  const price = parseFloat(priceStr);
  return isNaN(price) ? null : price;
}

export async function getCardPriceAndInfo(
  cardId: string,
  treatment: string
): Promise<{ price: number; name: string; set_name: string } | null> {
  const card = await getCardById(cardId);
  if (!card || !card.prices) return null;

  const priceKey = TREATMENT_MAP[treatment] || "usd";
  const priceStr = card.prices[priceKey as keyof ScryfallPrices];
  if (!priceStr) return null;

  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return null;

  return {
    price,
    name: card.name,
    set_name: card.set_name,
  };
}
