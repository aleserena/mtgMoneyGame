import { describe, expect, it } from "vitest";
import { validateAndApplyCard } from "./gameLogic";

describe("validateAndApplyCard", () => {
  it("accepts a valid card and reduces remaining by rounded price", () => {
    const result = validateAndApplyCard(100, { id: "1", price: 9.6 }, new Set());
    expect(result.valid).toBe(true);
    expect(result.newRemaining).toBe(90);
    expect(result.roundedPrice).toBe(10);
    expect(result.winner).toBe(false);
  });

  it("marks winner when remaining hits exactly zero", () => {
    const result = validateAndApplyCard(10, { id: "1", price: 9.6 }, new Set());
    expect(result.valid).toBe(true);
    expect(result.newRemaining).toBe(0);
    expect(result.winner).toBe(true);
  });

  it("rejects reused cards", () => {
    const result = validateAndApplyCard(100, { id: "1", price: 5 }, new Set(["1"]));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/already used/i);
  });

  it("treats overspend as invalid and sets overspend flag", () => {
    const result = validateAndApplyCard(5, { id: "1", price: 10 }, new Set());
    expect(result.valid).toBe(false);
    expect(result.overspend).toBe(true);
  });

  it("treats prices below $1 as costing $1", () => {
    const result = validateAndApplyCard(10, { id: "1", price: 0.75 }, new Set());
    expect(result.valid).toBe(true);
    expect(result.roundedPrice).toBe(1);
    expect(result.newRemaining).toBe(9);
  });
});

