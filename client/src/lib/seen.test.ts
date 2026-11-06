import { describe, expect, it } from "vitest";
import { clearSeen, hasSeen, markSeen } from "./seen";

function fake() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

describe("seen flags", () => {
  it("are per person and per key", () => {
    const s = fake();
    markSeen("u1", "welcome", s);
    expect(hasSeen("u1", "welcome", s)).toBe(true);
    expect(hasSeen("u2", "welcome", s)).toBe(false);
    expect(hasSeen("u1", "tip.pantry", s)).toBe(false);
  });
  it("clears only the requested prefix for that person", () => {
    const s = fake();
    markSeen("u1", "welcome", s);
    markSeen("u1", "tip.pantry", s);
    markSeen("u1", "tip.recipes", s);
    markSeen("u2", "tip.pantry", s);
    clearSeen("u1", "tip.", s);
    expect(hasSeen("u1", "tip.pantry", s)).toBe(false);
    expect(hasSeen("u1", "tip.recipes", s)).toBe(false);
    expect(hasSeen("u1", "welcome", s)).toBe(true);
    expect(hasSeen("u2", "tip.pantry", s)).toBe(true);
  });
  it("copes with no storage at all", () => {
    expect(hasSeen("u1", "x", null)).toBe(false);
    expect(() => markSeen("u1", "x", null)).not.toThrow();
    expect(() => clearSeen("u1", "", null)).not.toThrow();
  });
});
