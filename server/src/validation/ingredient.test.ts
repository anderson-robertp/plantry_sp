import {
  createIngredientInput,
  ingredientParams,
  listIngredientsQuery,
  updateIngredientInput,
} from "./ingredient.js";
import { describe, expect, it } from "@jest/globals";

const flour = { name: "  All-purpose flour ", category: "baking", baseUnitType: "mass", gramsPerMl: 0.53 };

describe("createIngredientInput", () => {
  it("trims the name, normalizes defaultUnit, and keeps densities", () => {
    const out = createIngredientInput.parse({ ...flour, defaultUnit: "Cups", isStaple: false });
    expect(out.name).toBe("All-purpose flour");
    expect(out.defaultUnit).toBe("cup");
    expect(out.gramsPerMl).toBe(0.53);
  });

  it("does not invent defaults", () => {
    const out = createIngredientInput.parse(flour);
    expect(out.isStaple).toBeUndefined();
    expect(out.defaultUnit).toBeUndefined();
  });

  it("rejects bad category, base unit type, zero/negative density, and blank names", () => {
    for (const bad of [
      { category: "not_a_catagory" },
      { baseUnitType: "weight" },
      { gramsPerMl: 0 },
      { gramsPerPiece: -1 },
      { name: "   " },
      { defaultUnit: "handful" },
    ]) {
      expect(createIngredientInput.safeParse({ ...flour, ...bad }).success).toBe(false);
    }
  });

  it("requires name and baseUnitType; category and aliases are optional", () => {
    const { category: _c, ...noCategory } = flour as Record<string, unknown>;
    expect(createIngredientInput.safeParse(noCategory).success).toBe(true);
    for (const key of ["name", "baseUnitType"]) {
      const { [key]: _omit, ...rest } = flour as Record<string, unknown>;
      expect(createIngredientInput.safeParse(rest).success).toBe(false);
    }
  });
});

describe("aliases", () => {
  it("are trimmed; blanks and long lists are rejected", () => {
    expect(createIngredientInput.parse({ ...flour, aliases: ["  AP flour "] }).aliases).toEqual(["AP flour"]);
    expect(createIngredientInput.safeParse({ ...flour, aliases: ["  "] }).success).toBe(false);
    expect(createIngredientInput.safeParse({ ...flour, aliases: Array(21).fill("x") }).success).toBe(false);
  });
});

describe("updateIngredientInput", () => {
  it("rejects an empty update", () => {
    expect(updateIngredientInput.safeParse({}).success).toBe(false);
  });

  it("accepts aliases", () => {
    expect(updateIngredientInput.parse({ aliases: ["a"] })).toEqual({ aliases: ["a"] });
  });

  it("allows descriptive fields and strips units and densities", () => {
    const out = updateIngredientInput.parse({ name: "Flour", isStaple: true, baseUnitType: "volume", gramsPerMl: 9 });
    expect(out).toEqual({ name: "Flour", isStaple: true });
  });

  it("an update of only immutable fields counts as empty", () => {
    expect(updateIngredientInput.safeParse({ baseUnitType: "volume" }).success).toBe(false);
  });
});

describe("params and list query", () => {
  const ID = "AB".repeat(12);
  it("lowercases the id and rejects junk", () => {
    expect(ingredientParams.parse({ ingredientId: ID })).toEqual({ ingredientId: ID.toLowerCase() });
    expect(ingredientParams.safeParse({ ingredientId: "x" }).success).toBe(false);
  });

  it("applies defaults and coerces", () => {
    expect(listIngredientsQuery.parse({})).toEqual({ scope: "all", page: 1, limit: 50 });
    expect(listIngredientsQuery.parse({ search: " fl ", category: "dairy", scope: "global", page: "2", limit: "5" })).toEqual({
      search: "fl", category: "dairy", scope: "global", page: 2, limit: 5,
    });
  });

  it("rejects bad scope, category and paging", () => {
    for (const q of [{ scope: "mine" }, { category: "x" }, { page: "0" }, { limit: "101" }]) {
      expect(listIngredientsQuery.safeParse(q).success).toBe(false);
    }
  });
});
