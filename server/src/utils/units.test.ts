import {
  CANONICAL_UNITS,
  UnitConversionError,
  baseUnitFor,
  fromBaseQuantity,
  normalizeUnit,
  toBaseQuantity,
  ConvertibleIngredient,
} from "./units.js";
import { describe, expect, it } from "@jest/globals";

// Representative ingredients
const flour: ConvertibleIngredient = { baseUnitType: "mass", gramsPerMl: 0.53 };
const milk: ConvertibleIngredient = { baseUnitType: "volume", gramsPerMl: 1.03 };
const onion: ConvertibleIngredient = { baseUnitType: "count", gramsPerPiece: 150 };
const garlic: ConvertibleIngredient = { baseUnitType: "count", gramsPerPiece: 5 };
const sugarNoDensity: ConvertibleIngredient = { baseUnitType: "mass" };
const eggs: ConvertibleIngredient = { baseUnitType: "count" };

describe("normalizeUnit", () => {
  it("passes canonical units through", () => {
    for (const u of CANONICAL_UNITS) expect(normalizeUnit(u)).toBe(u);
  });

  it("maps common spellings and punctuation", () => {
    expect(normalizeUnit("Tbsp.")).toBe("tbsp");
    expect(normalizeUnit("tablespoons")).toBe("tbsp");
    expect(normalizeUnit("  CUPS ")).toBe("cup");
    expect(normalizeUnit("Teaspoon")).toBe("tsp");
    expect(normalizeUnit("lbs")).toBe("lb");
    expect(normalizeUnit("pounds")).toBe("lb");
    expect(normalizeUnit("fl oz")).toBe("fl_oz");
    expect(normalizeUnit("fluid ounces")).toBe("fl_oz");
    expect(normalizeUnit("cloves")).toBe("piece");
    expect(normalizeUnit("each")).toBe("piece");
  });

  it("returns null for unknown or empty input", () => {
    expect(normalizeUnit("bunch-ish")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
    expect(normalizeUnit("   ")).toBeNull();
  });
});

describe("baseUnitFor", () => {
  it("returns g / ml / piece by base unit type", () => {
    expect(baseUnitFor(flour)).toBe("g");
    expect(baseUnitFor(milk)).toBe("ml");
    expect(baseUnitFor(onion)).toBe("piece");
  });
});

describe("toBaseQuantity: same unit type (no density needed)", () => {
  it("mass to grams", () => {
    expect(toBaseQuantity(500, "g", sugarNoDensity)).toBe(500);
    expect(toBaseQuantity(2, "kg", sugarNoDensity)).toBe(2000);
    expect(toBaseQuantity(1, "lb", sugarNoDensity)).toBeCloseTo(453.5924, 3);
    expect(toBaseQuantity(8, "oz", sugarNoDensity)).toBeCloseTo(226.7962, 3);
  });

  it("volume to milliliters", () => {
    expect(toBaseQuantity(250, "ml", { baseUnitType: "volume" })).toBe(250);
    expect(toBaseQuantity(1.5, "l", { baseUnitType: "volume" })).toBe(1500);
    expect(toBaseQuantity(1, "cup", { baseUnitType: "volume" })).toBeCloseTo(236.5882, 3);
    expect(toBaseQuantity(1, "tbsp", { baseUnitType: "volume" })).toBeCloseTo(14.7868, 3);
    expect(toBaseQuantity(1, "tsp", { baseUnitType: "volume" })).toBeCloseTo(4.9289, 3);
    expect(toBaseQuantity(1, "fl_oz", { baseUnitType: "volume" })).toBeCloseTo(29.5735, 3);
  });

  it("count stays count", () => {
    expect(toBaseQuantity(3, "piece", eggs)).toBe(3);
    expect(toBaseQuantity(12, "each", eggs)).toBe(12);
  });

  it("uses synonyms", () => {
    expect(toBaseQuantity(2, "Tablespoons", { baseUnitType: "volume" })).toBeCloseTo(29.5735, 3);
  });

  it("keeps tbsp/tsp ratio consistent (3 tsp = 1 tbsp)", () => {
    const v: ConvertibleIngredient = { baseUnitType: "volume" };
    expect(toBaseQuantity(3, "tsp", v)).toBeCloseTo(toBaseQuantity(1, "tbsp", v), 3);
  });

  it("handles zero", () => {
    expect(toBaseQuantity(0, "cup", milk)).toBe(0);
  });
});

describe("toBaseQuantity: cross-type conversions use density", () => {
  it("volume -> mass (1 cup flour in grams)", () => {
    // 236.5882 ml * 0.53 g/ml
    expect(toBaseQuantity(1, "cup", flour)).toBeCloseTo(125.3918, 3);
  });

  it("mass -> volume (500 g milk in ml)", () => {
    // 500 / 1.03
    expect(toBaseQuantity(500, "g", milk)).toBeCloseTo(485.4369, 3);
  });

  it("count -> mass (2 pieces of something with gramsPerPiece)", () => {
    const apple: ConvertibleIngredient = { baseUnitType: "mass", gramsPerPiece: 180 };
    expect(toBaseQuantity(2, "piece", apple)).toBe(360);
  });

  it("mass -> count (300 g onion = 2 onions)", () => {
    expect(toBaseQuantity(300, "g", onion)).toBe(2);
  });

  it("volume -> count (via grams)", () => {
    const both: ConvertibleIngredient = {
      baseUnitType: "count",
      gramsPerMl: 1,
      gramsPerPiece: 50,
    };
    // 100 ml = 100 g = 2 pieces
    expect(toBaseQuantity(100, "ml", both)).toBe(2);
  });

  it("count -> volume (via grams)", () => {
    const both: ConvertibleIngredient = {
      baseUnitType: "volume",
      gramsPerMl: 1,
      gramsPerPiece: 50,
    };
    expect(toBaseQuantity(2, "piece", both)).toBe(100);
  });

  it("recipe in cups and pantry in grams land on the same scale", () => {
    const recipeNeeds = toBaseQuantity(2, "cup", flour);
    const pantryHas = toBaseQuantity(1, "kg", flour);
    expect(pantryHas).toBeGreaterThan(recipeNeeds);
    expect(pantryHas - recipeNeeds).toBeCloseTo(1000 - 2 * 236.5882365 * 0.53, 2);
  });

  it("garlic cloves to grams (count ingredient entered by weight)", () => {
    expect(toBaseQuantity(15, "g", garlic)).toBe(3);
  });
});

describe("toBaseQuantity: errors", () => {
  it("throws for an unknown unit", () => {
    expect(() => toBaseQuantity(1, "handful", flour)).toThrow(UnitConversionError);
    expect(() => toBaseQuantity(1, "handful", flour)).toThrow(/Unknown unit/);
  });

  it("throws for negative, NaN, or infinite quantities", () => {
    expect(() => toBaseQuantity(-1, "g", flour)).toThrow(UnitConversionError);
    expect(() => toBaseQuantity(NaN, "g", flour)).toThrow(UnitConversionError);
    expect(() => toBaseQuantity(Infinity, "g", flour)).toThrow(UnitConversionError);
  });

  it("throws when volume -> mass lacks gramsPerMl", () => {
    expect(() => toBaseQuantity(1, "cup", sugarNoDensity)).toThrow(/gramsPerMl/);
  });

  it("throws when count -> mass lacks gramsPerPiece", () => {
    expect(() => toBaseQuantity(2, "piece", sugarNoDensity)).toThrow(/gramsPerPiece/);
  });

  it("throws when mass -> count lacks gramsPerPiece", () => {
    expect(() => toBaseQuantity(100, "g", eggs)).toThrow(/gramsPerPiece/);
  });

  it("treats zero density as missing (no divide by zero)", () => {
    const bad: ConvertibleIngredient = { baseUnitType: "volume", gramsPerMl: 0 };
    expect(() => toBaseQuantity(100, "g", bad)).toThrow(UnitConversionError);
  });
});

describe("fromBaseQuantity", () => {
  it("is the inverse of toBaseQuantity for same-type units", () => {
    const base = toBaseQuantity(2, "cup", { baseUnitType: "volume" });
    expect(fromBaseQuantity(base, "cup", { baseUnitType: "volume" })).toBeCloseTo(2, 3);
  });

  it("is the inverse across types", () => {
    const base = toBaseQuantity(1.5, "cup", flour); // grams
    expect(fromBaseQuantity(base, "cup", flour)).toBeCloseTo(1.5, 3);
  });

  it("shows grams as pounds for a shopping list", () => {
    expect(fromBaseQuantity(907.18474, "lb", flour)).toBeCloseTo(2, 3);
  });

  it("throws on unknown unit and missing density", () => {
    expect(() => fromBaseQuantity(100, "bunch", flour)).toThrow(UnitConversionError);
    expect(() => fromBaseQuantity(100, "cup", sugarNoDensity)).toThrow(/gramsPerMl/);
  });
});
