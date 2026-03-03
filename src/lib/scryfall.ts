const SCRYFALL_BASE = "https://api.scryfall.com";

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

interface ScryfallCard {
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

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 100;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

export async function autocomplete(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  const res = await rateLimitedFetch(
    `${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
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
  const res = await rateLimitedFetch(
    `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}&unique=prints`
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
  return cards
    .map((c) => {
      if (!c.prices) return null;
      const rawFinishes = c.finishes || ["nonfoil"];
      const validFinishes = rawFinishes.filter((f) => {
        const priceKey = FINISH_TO_PRICE[f] || "usd";
        const priceStr = c.prices[priceKey as keyof ScryfallPrices];
        if (!priceStr) return false;
        const price = parseFloat(priceStr);
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
}

export async function getCardById(id: string): Promise<ScryfallCard | null> {
  const res = await rateLimitedFetch(`${SCRYFALL_BASE}/cards/${id}`);
  if (!res.ok) return null;
  return res.json();
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
