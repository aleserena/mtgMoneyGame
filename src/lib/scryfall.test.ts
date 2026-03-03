import { describe, expect, it, vi, beforeEach } from "vitest";
import { autocomplete, getCardPriceAndInfo } from "./scryfall";

declare const global: typeof globalThis & { fetch?: typeof fetch };

describe("scryfall helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array for short autocomplete queries", async () => {
    const result = await autocomplete("a");
    expect(result).toEqual([]);
  });

  it("uses fetch for autocomplete and caches subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: ["Black Lotus"] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const first = await autocomplete("Black Lotus");
    const second = await autocomplete("Black Lotus");

    expect(first).toEqual(["Black Lotus"]);
    expect(second).toEqual(["Black Lotus"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("derives price and info from card details", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "1",
        name: "Test Card",
        set_name: "Test Set",
        prices: {
          usd: "3.50",
          usd_foil: null,
          usd_etched: null,
          usd_glossy: null,
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getCardPriceAndInfo("1", "nonfoil");
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      price: 3.5,
      name: "Test Card",
      set_name: "Test Set",
    });
  });
});

