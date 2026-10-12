import { INGREDIENT_CATEGORIES } from "../utils/constants.js";
import { normalizeName } from "../utils/text.js";
import { toBaseQuantity } from "../utils/units.js";
import { createIngredientInput } from "../validation/ingredient.js";
import { GLOBAL_INGREDIENTS } from "./globalIngredients.js";
import { describe, expect, it } from "@jest/globals";


describe("global ingredient catalog", () => {
  it("passes the same validation the API applies", () => {
    for (const ing of GLOBAL_INGREDIENTS) {
      const res = createIngredientInput.safeParse(ing);
      if (!res.success) throw new Error(`${ing.name}: ${res.error.issues[0]?.message}`);
    }
  });

  it("uses only known categories", () => {
    for (const ing of GLOBAL_INGREDIENTS) {
      expect((INGREDIENT_CATEGORIES as readonly string[]).includes(ing.category)).toBe(true);
    }
  });

  it("has no repeated name or alias (each resolves to exactly one ingredient)", () => {
    const seen = new Map<string, string>();
    for (const ing of GLOBAL_INGREDIENTS) {
      for (const label of [ing.name, ...(ing.aliases ?? [])]) {
        const key = normalizeName(label);
        const owner = seen.get(key);
        if (owner !== undefined && owner !== ing.name) {
          throw new Error(`"${label}" is used by both "${owner}" and "${ing.name}"`);
        }
        seen.set(key, ing.name);
      }
    }
  });

  it("every default unit converts with the data given", () => {
    for (const ing of GLOBAL_INGREDIENTS) {
      const base = toBaseQuantity(1, ing.defaultUnit, ing);
      expect(Number.isFinite(base) && base > 0).toBe(true);
    }
  });

  it("every ingredient can be written in grams, and volume ones also in ml", () => {
    for (const ing of GLOBAL_INGREDIENTS) {
      expect(toBaseQuantity(100, "g", ing) > 0).toBe(true);
    }
  });

  it("count ingredients have a piece weight; pieces convert for the rest only when given", () => {
    for (const ing of GLOBAL_INGREDIENTS) {
      if (ing.baseUnitType === "count") expect(typeof ing.gramsPerPiece).toBe("number");
    }
  });

  it("densities are plausible (food is 0.05 to 1.6 g/ml)", () => {
    for (const ing of GLOBAL_INGREDIENTS) {
      if (ing.gramsPerMl !== undefined) {
        expect(ing.gramsPerMl >= 0.05 && ing.gramsPerMl <= 1.6).toBe(true);
      }
    }
  });

  it("only a handful of staples, and the obvious ones", () => {
    const staples = GLOBAL_INGREDIENTS.filter((i) => i.isStaple).map((i) => i.name).sort();
    expect(staples).toEqual(["Black pepper", "Olive oil", "Salt", "Vegetable oil", "Water"]);
  });
});
