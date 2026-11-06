import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS } from "./convert";
import { hostOf, needsAttention, toFormLine } from "./importLines";
import type { ImportIngredient, ImportLine } from "./types";

const flour: ImportIngredient = { _id: "f", name: "Flour", baseUnitType: "mass", gramsPerMl: 0.53 };
const line = (o: Partial<ImportLine>): ImportLine => ({ originalText: "2 cups flour", quantity: 2, unit: "cup", name: "flour", optional: false, match: null, suggestions: [], ...o });

describe("toFormLine", () => {
  it("fills in a confident match without a hint", () => {
    const f = toFormLine(line({ match: { ingredient: flour, confidence: "exact", unitFits: true } }), DEFAULT_PREFS);
    expect(f).toMatchObject({ ingredient: { id: "f", name: "Flour" }, quantity: "2", unit: "cup", from: "2 cups flour", searchHint: "flour" });
    expect(f.hint).toBeUndefined();
    expect(needsAttention([f])).toBe(0);
  });

  it("flags unmatched lines and offers suggestions", () => {
    const f = toFormLine(line({ suggestions: [flour] }), DEFAULT_PREFS);
    expect(f.ingredient).toBeNull();
    expect(f.hint).toMatchObject({ kind: "missing", suggestions: [{ id: "f" }] });
    expect(needsAttention([f])).toBe(1);
  });

  it("flags units that can't convert, missing amounts and close matches", () => {
    expect(toFormLine(line({ match: { ingredient: flour, confidence: "exact", unitFits: false } }), DEFAULT_PREFS).hint?.kind).toBe("unit");
    const none = toFormLine(line({ quantity: null, unit: null, match: { ingredient: flour, confidence: "exact", unitFits: true } }), DEFAULT_PREFS);
    expect(none).toMatchObject({ quantity: "", hint: { kind: "amount" } });
    expect(none.unit).toBe("cup"); // the person's usual unit for flour
    const close = toFormLine(line({ match: { ingredient: flour, confidence: "close", unitFits: true } }), DEFAULT_PREFS);
    expect(close.hint?.kind).toBe("check");
    expect(needsAttention([close])).toBe(0);
  });

  it("keeps the original text and notes for saving", () => {
    const f = toFormLine(line({ notes: "finely chopped", optional: true }), DEFAULT_PREFS);
    expect(f.extra).toEqual({ originalText: "2 cups flour", notes: "finely chopped" });
    expect(f.optional).toBe(true);
  });

  it("trims long quantities", () => {
    expect(toFormLine(line({ quantity: 1 / 3 }), DEFAULT_PREFS).quantity).toBe("0.333");
  });
});

describe("hostOf", () => {
  it("shows a readable site name", () => {
    expect(hostOf("https://www.example.com/a/b")).toBe("example.com");
    expect(hostOf("nonsense")).toBe("nonsense");
  });
});
