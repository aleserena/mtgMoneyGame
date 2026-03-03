import type { AiStrategy } from "./types";

export const TARGET_MIN = 350;
export const TARGET_MAX = 1000;

export const DEFAULT_TARGET = 500;

export const SCRYFALL_BASE_URL = "https://api.scryfall.com";

// Scryfall guidelines allow up to 10 requests/sec.
// We stay well under that from a single process.
export const SCRYFALL_MIN_INTERVAL_MS = 100;

// Cache TTL for Scryfall responses (in milliseconds).
// Short enough to keep prices fresh but still reduce latency and load.
export const SCRYFALL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const DEFAULT_AI_STRATEGY: AiStrategy = "simple";

