import { resolveBaseQuantity, resolveIngredientLines, type IngredientMap } from "./resolve.js";
import { AppError } from "../utils/errors.js";
import type { ConvertibleIngredient } from "../utils/units.js";
import { describe, expect, it } from "@jest/globals";

const FLOUR = "a1".repeat(12);
const MILK = "b2".repeat(12);
const EGGS = "c3".repeat(12);
const SALT = "d4".repeat(12); // mass, no density
const MISSING = "e5".repeat(12);

const ingredients: IngredientMap = new Map<string, ConvertibleIngredient>([
  [FLOUR, { baseUnitType: "mass", gramsPerMl: 0.53 }],
  [MILK, { baseUnitType: "volume", gramsPerMl: 1.03 }],
  [EGGS, { baseUnitType: "count" }],
  [SALT, { baseUnitType: "mass" }],
]);

function thrown(fn: () => unknown): AppError {
  try {
    fn();
  } catch (e) {
    return e as AppError;
  }
  throw new Error("expected function to throw");
}

describe("resolveBaseQuantity", () => {
  it("converts into the ingredient's base unit", () => {
    expect(resolveBaseQuantity(FLOUR, 2, "cup", ingredients)).toBeCloseTo(250.7837, 3);
    expect(resolveBaseQuantity(FLOUR, 1, "kg", ingredients)).toBe(1000);
    expect(resolveBaseQuantity(MILK, 500, "ml", ingredients)).toBe(500);
    expect(resolveBaseQuantity(EGGS, 3, "piece", ingredients)).toBe(3);
  });

  it("throws a 422 unknown_ingredient for ids not in the map", () => {
    const err = thrown(() => resolveBaseQuantity(MISSING, 1, "g", ingredients));
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("unknown_ingredient");
  });

  it("wraps unit conversion problems as a 422 unit_conversion", () => {
    const err = thrown(() => resolveBaseQuantity(SALT, 1, "cup", ingredients));
    expect(err.status).toBe(422);
    expect(err.code).toBe("unit_conversion");
    expect(err.message).toMatch(/gramsPerMl/);
  });

  it("wraps unknown units the same way", () => {
    const err = thrown(() => resolveBaseQuantity(FLOUR, 1, "handful", ingredients));
    expect(err.code).toBe("unit_conversion");
    expect(err.message).toMatch(/Unknown unit/);
  });
});

describe("resolveIngredientLines", () => {
  it("adds baseQuantity to every line and keeps display fields", () => {
    const lines = resolveIngredientLines(
      [
        { ingredientId: FLOUR, quantity: 2, unit: "cup", originalText: "2 cups flour", group: "Crust" },
        { ingredientId: MILK, quantity: 1, unit: "l", notes: "whole" },
        { ingredientId: EGGS, quantity: 2, unit: "piece", optional: true },
      ],
      ingredients
    );

    expect(lines).toHaveLength(3);
    expect(lines[0]?.baseQuantity).toBeCloseTo(250.7837, 3);
    expect(lines[0]?.originalText).toBe("2 cups flour");
    expect(lines[0]?.group).toBe("Crust");
    expect(lines[1]?.baseQuantity).toBe(1000);
    expect(lines[1]?.notes).toBe("whole");
    expect(lines[2]?.baseQuantity).toBe(2);
  });

  it("defaults optional to false", () => {
    const [line] = resolveIngredientLines(
      [{ ingredientId: EGGS, quantity: 1, unit: "piece" }],
      ingredients
    );
    expect(line?.optional).toBe(false);
  });

  it("allows the same ingredient on multiple lines", () => {
    const lines = resolveIngredientLines(
      [
        { ingredientId: FLOUR, quantity: 100, unit: "g", group: "Crust" },
        { ingredientId: FLOUR, quantity: 50, unit: "g", group: "Filling" },
      ],
      ingredients
    );
    expect(lines.map((l) => l.baseQuantity)).toEqual([100, 50]);
  });

  it("reports which line failed", () => {
    const err = thrown(() =>
      resolveIngredientLines(
        [
          { ingredientId: FLOUR, quantity: 1, unit: "cup" },
          { ingredientId: MISSING, quantity: 1, unit: "g" },
        ],
        ingredients
      )
    );
    expect(err.status).toBe(422);
    expect(err.code).toBe("unknown_ingredient");
    expect(err.message).toMatch(/line 2/);
    expect(err.details?.line).toBe(1);
  });

  it("reports conversion failures with the line number", () => {
    const err = thrown(() =>
      resolveIngredientLines([{ ingredientId: SALT, quantity: 1, unit: "tsp" }], ingredients)
    );
    expect(err.code).toBe("unit_conversion");
    expect(err.message).toMatch(/line 1/);
    expect(err.details?.ingredientId).toBe(SALT);
  });

  it("omits optional keys that were not provided (Mongoose rejects explicit undefined)", () => {
    const [line] = resolveIngredientLines(
      [{ ingredientId: EGGS, quantity: 1, unit: "piece", notes: undefined }],
      ingredients
    );
    expect(line).not.toHaveProperty("originalText");
    expect(line).not.toHaveProperty("notes");
    expect(line).not.toHaveProperty("group");
  });

  it("returns an empty array for no lines", () => {
    expect(resolveIngredientLines([], ingredients)).toEqual([]);
  });
});
