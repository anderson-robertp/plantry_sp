import { describe, expect, it } from "@jest/globals";
import type { IngredientInfo } from "./buildShoppingList.js";
import { matchRecipes, type MatchRecipe } from "./recipeMatch.js";

const info = (name: string, extra: Partial<IngredientInfo> = {}): IngredientInfo => ({
  name,
  category: "other",
  baseUnitType: "mass",
  ...extra,
});

const ingredients = new Map<string, IngredientInfo>([
  ["pasta", info("Pasta", { category: "grains" })],
  ["tomato", info("Tomato", { category: "produce", baseUnitType: "count" })],
  ["cheese", info("Cheese", { category: "dairy" })],
  ["salt", info("Salt", { isStaple: true })],
  ["basil", info("Basil", { category: "produce" })],
]);

const recipe = (id: string, name: string, lines: [string, number, boolean?][], servings = 2): MatchRecipe => ({
  id,
  name,
  servings,
  ingredients: lines.map(([ingredientId, baseQuantity, optional]) => ({ ingredientId, baseQuantity, optional })),
});

const pasta = recipe("r1", "Pasta", [["pasta", 200], ["tomato", 2], ["salt", 5]]);
const pantry = [
  { ingredientId: "pasta", baseQuantity: 500 },
  { ingredientId: "tomato", baseQuantity: 3 },
];

describe("matchRecipes", () => {
  it("a recipe the pantry fully covers can be cooked, and staples don't count against it", () => {
    const [m] = matchRecipes({ recipes: [pasta], ingredients, pantry });
    expect(m).toMatchObject({ recipeId: "r1", canCook: true, coverage: 1, totalIngredients: 2, haveCount: 2, missing: [] });
  });

  it("lists what's missing with exact and display amounts", () => {
    const [m] = matchRecipes({ recipes: [pasta], ingredients, pantry: [{ ingredientId: "pasta", baseQuantity: 500 }] });
    expect(m?.canCook).toBe(false);
    expect(m?.coverage).toBe(0.5);
    expect(m?.missing).toHaveLength(1);
    expect(m?.missing[0]).toMatchObject({ ingredientId: "tomato", name: "Tomato", needed: 2, have: 0, missing: 2 });
    expect(m?.missing[0]?.display).toMatchObject({ unit: "piece", toBuy: 2 });
  });

  it("partly covered counts as missing, and only the shortfall is reported", () => {
    const [m] = matchRecipes({ recipes: [pasta], ingredients, pantry: [{ ingredientId: "pasta", baseQuantity: 150 }, { ingredientId: "tomato", baseQuantity: 2 }] });
    expect(m?.canCook).toBe(false);
    expect(m?.missing[0]).toMatchObject({ ingredientId: "pasta", needed: 200, have: 150, missing: 50 });
    expect(m?.haveCount).toBe(1);
  });

  it("a recipe is scored as written, at its own servings", () => {
    const big = recipe("r2", "Big", [["pasta", 400]], 4);
    expect(matchRecipes({ recipes: [big], ingredients, pantry: [{ ingredientId: "pasta", baseQuantity: 400 }] })[0]?.canCook).toBe(true);
  });

  it("optional lines are ignored unless asked for", () => {
    const r = recipe("r3", "Garnished", [["pasta", 100], ["basil", 10, true]]);
    const p = [{ ingredientId: "pasta", baseQuantity: 100 }];
    expect(matchRecipes({ recipes: [r], ingredients, pantry: p })[0]?.canCook).toBe(true);
    expect(matchRecipes({ recipes: [r], ingredients, pantry: p, options: { includeOptional: true } })[0]?.canCook).toBe(false);
  });

  it("staples are counted when asked for", () => {
    const r = recipe("r4", "Salty", [["salt", 5]]);
    expect(matchRecipes({ recipes: [r], ingredients, pantry: [] })[0]?.canCook).toBe(true);
    expect(matchRecipes({ recipes: [r], ingredients, pantry: [], options: { includeStaples: true } })[0]?.canCook).toBe(false);
  });

  it("expired batches don't count when asOf is given", () => {
    const p = [{ ingredientId: "pasta", baseQuantity: 500, expirationDate: new Date("2026-10-01T00:00:00Z") }];
    const r = recipe("r5", "Just pasta", [["pasta", 100]]);
    expect(matchRecipes({ recipes: [r], ingredients, pantry: p })[0]?.canCook).toBe(true);
    expect(matchRecipes({ recipes: [r], ingredients, pantry: p, options: { asOf: new Date("2026-10-17T00:00:00Z") } })[0]?.canCook).toBe(false);
  });

  it("a recipe with a deleted ingredient or bad servings is never 'can cook'", () => {
    const ghost = recipe("r6", "Ghost", [["pasta", 100], ["gone", 1]]);
    const bad = recipe("r7", "Bad", [["pasta", 100]], 0);
    const p = [{ ingredientId: "pasta", baseQuantity: 500 }];
    const out = matchRecipes({ recipes: [ghost, bad], ingredients, pantry: p });
    expect(out.every((m) => !m.canCook && m.warnings.length > 0)).toBe(true);
  });

  it("a recipe with no countable lines is trivially cookable with full coverage", () => {
    const empty = recipe("r8", "Water", []);
    expect(matchRecipes({ recipes: [empty], ingredients, pantry: [] })[0]).toMatchObject({ canCook: true, coverage: 1, totalIngredients: 0 });
  });

  it("sorts cookable first, then by coverage, then fewest missing, then name", () => {
    const a = recipe("a", "Zucchini bake", [["pasta", 100]]); // cookable
    const b = recipe("b", "Half", [["pasta", 100], ["cheese", 50]]); // 0.5
    const c = recipe("c", "Third", [["pasta", 100], ["cheese", 50], ["basil", 5]]); // 0.333
    const d = recipe("d", "Apple bake", [["pasta", 100]]); // cookable, name sorts before Zucchini
    const e = recipe("e", "Zero", [["cheese", 50], ["basil", 5]]); // 0
    const out = matchRecipes({ recipes: [e, c, b, a, d], ingredients, pantry: [{ ingredientId: "pasta", baseQuantity: 500 }] });
    expect(out.map((m) => m.recipeId)).toEqual(["d", "a", "b", "c", "e"]);
  });

  it("each recipe is judged against the whole pantry independently", () => {
    const r1 = recipe("x", "X", [["pasta", 400]]);
    const r2 = recipe("y", "Y", [["pasta", 400]]);
    const out = matchRecipes({ recipes: [r1, r2], ingredients, pantry: [{ ingredientId: "pasta", baseQuantity: 400 }] });
    expect(out.every((m) => m.canCook)).toBe(true); // not "used up" by the other
  });
});
