import { describe, expect, it } from "vitest";
import { planServings, scaleNote } from "./servings";

describe("planServings", () => {
  it("prefers the household size", () => {
    expect(planServings(4, 6)).toBe(4);
    expect(planServings(null, 6)).toBe(6);
    expect(planServings(undefined, 6)).toBe(6);
    expect(planServings(null, undefined)).toBeNull();
    expect(planServings(0, 2)).toBe(2);
  });
});

describe("scaleNote", () => {
  it("says how the recipe is being scaled", () => {
    expect(scaleNote(4, 2)).toBe("Recipe makes 4 · planning 2 (½×)");
    expect(scaleNote(2, 6)).toBe("Recipe makes 2 · planning 6 (3×)");
  });
  it("says nothing when it's the same or unknown", () => {
    expect(scaleNote(4, 4)).toBeNull();
    expect(scaleNote(undefined, 4)).toBeNull();
    expect(scaleNote(4, null)).toBeNull();
  });
});
