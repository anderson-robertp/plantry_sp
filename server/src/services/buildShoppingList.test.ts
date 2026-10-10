import {
  buildShoppingList,
  carryOverChecked,
  groupByAisle,
  type IngredientInfo,
  type PantryBatchInput,
  type RecipeInput,
  type ShoppingItem,
} from "./buildShoppingList.js";
import { describe, expect, it } from "@jest/globals";

const info = (
  name: string,
  baseUnitType: IngredientInfo["baseUnitType"],
  extra: Partial<IngredientInfo> = {}
): IngredientInfo => ({ name, baseUnitType, ...extra });

const ingredients = new Map<string, IngredientInfo>([
  ["flour", info("Flour", "mass", { category: "pantry" })],
  ["milk", info("Milk", "volume", { category: "dairy" })],
  ["egg", info("Egg", "count", { category: "dairy" })],
  ["onion", info("Onion", "count", { category: "produce" })],
  ["salt", info("Salt", "mass", { category: "spices", isStaple: true })],
  ["parsley", info("Parsley", "mass", { category: "produce" })],
]);

const recipes = new Map<string, RecipeInput>([
  [
    "pancakes",
    {
      servings: 4,
      ingredients: [
        { ingredientId: "flour", baseQuantity: 250 },
        { ingredientId: "milk", baseQuantity: 500 },
        { ingredientId: "egg", baseQuantity: 2 },
        { ingredientId: "salt", baseQuantity: 2 },
        { ingredientId: "parsley", baseQuantity: 5, optional: true },
      ],
    },
  ],
  [
    "omelette",
    {
      servings: 2,
      ingredients: [
        { ingredientId: "egg", baseQuantity: 4 },
        { ingredientId: "milk", baseQuantity: 50 },
        { ingredientId: "onion", baseQuantity: 1 },
      ],
    },
  ],
  [
    "double",
    {
      servings: 1,
      ingredients: [
        { ingredientId: "flour", baseQuantity: 100 },
        { ingredientId: "flour", baseQuantity: 50 },
      ],
    },
  ],
]);

function find(items: ShoppingItem[], id: string): ShoppingItem {
  const item = items.find((i) => i.ingredientId === id);
  if (!item) throw new Error(`expected ${id} in the list`);
  return item;
}

const ids = (items: ShoppingItem[]) => items.map((i) => i.ingredientId);

describe("scaling and aggregation", () => {
  it("scales a recipe by entry servings / recipe servings", () => {
    const out = buildShoppingList({
      entries: [{ recipeId: "pancakes", servings: 8 }],
      recipes,
      ingredients,
      pantry: [],
    });
    expect(find(out.toBuy, "flour").needed).toBe(500);
    expect(find(out.toBuy, "milk").needed).toBe(1000);
    expect(find(out.toBuy, "egg").needed).toBe(4);
    // aisle order: dairy (egg, milk) before pantry (flour)
    expect(ids(out.toBuy)).toEqual(["egg", "milk", "flour"]);
    expect(out.warnings).toEqual([]);
  });

  it("scales down too", () => {
    const out = buildShoppingList({
      entries: [{ recipeId: "pancakes", servings: 2 }],
      recipes,
      ingredients,
      pantry: [],
    });
    expect(find(out.toBuy, "flour").needed).toBe(125);
    expect(find(out.toBuy, "egg").needed).toBe(1);
  });

  it("adds up the same ingredient across recipes and tracks sources, biggest first", () => {
    const out = buildShoppingList({
      entries: [
        { recipeId: "pancakes", servings: 4 },
        { recipeId: "omelette", servings: 2 },
      ],
      recipes,
      ingredients,
      pantry: [],
    });
    const egg = find(out.toBuy, "egg");
    expect(egg.needed).toBe(6);
    expect(egg.sources).toEqual([
      { recipeId: "omelette", baseQuantity: 4 },
      { recipeId: "pancakes", baseQuantity: 2 },
    ]);
    expect(find(out.toBuy, "milk").needed).toBe(550);
    expect(find(out.toBuy, "onion").needed).toBe(1);
  });

  it("adds up the same ingredient used twice in one recipe", () => {
    const out = buildShoppingList({
      entries: [{ recipeId: "double", servings: 1 }],
      recipes,
      ingredients,
      pantry: [],
    });
    expect(find(out.toBuy, "flour").needed).toBe(150);
  });

  it("counts a recipe planned on several days once per entry", () => {
    const out = buildShoppingList({
      entries: [
        { recipeId: "pancakes", servings: 4 },
        { recipeId: "pancakes", servings: 4 },
      ],
      recipes,
      ingredients,
      pantry: [],
    });
    const flour = find(out.toBuy, "flour");
    expect(flour.needed).toBe(500);
    expect(flour.sources).toEqual([{ recipeId: "pancakes", baseQuantity: 500 }]);
  });

  it("returns empty lists for an empty plan", () => {
    const out = buildShoppingList({ entries: [], recipes, ingredients, pantry: [] });
    expect(out).toEqual({ toBuy: [], covered: [], staples: [], warnings: [] });
  });

  it("ignores zero-quantity lines ('to taste')", () => {
    const r = new Map<string, RecipeInput>([
      [
        "r",
        {
          servings: 1,
          ingredients: [
            { ingredientId: "parsley", baseQuantity: 0 },
            { ingredientId: "flour", baseQuantity: 10 },
          ],
        },
      ],
    ]);
    const out = buildShoppingList({
      entries: [{ recipeId: "r", servings: 1 }],
      recipes: r,
      ingredients,
      pantry: [],
    });
    expect(ids(out.toBuy)).toEqual(["flour"]);
  });
});

describe("pantry subtraction", () => {
  const entries = [{ recipeId: "pancakes", servings: 8 }];

  it("sums batches, subtracts, and splits into toBuy and covered", () => {
    const pantry: PantryBatchInput[] = [
      { ingredientId: "flour", baseQuantity: 100 },
      { ingredientId: "flour", baseQuantity: 200 },
      { ingredientId: "milk", baseQuantity: 2000 },
      { ingredientId: "onion", baseQuantity: 5 }, // not needed by the plan: ignored
    ];
    const out = buildShoppingList({ entries, recipes, ingredients, pantry });

    const flour = find(out.toBuy, "flour");
    expect(flour.have).toBe(300);
    expect(flour.toBuy).toBe(200);
    expect(find(out.toBuy, "egg").toBuy).toBe(4);

    expect(ids(out.covered)).toEqual(["milk"]);
    const milk = find(out.covered, "milk");
    expect(milk.toBuy).toBe(0);
    expect(milk.display).toEqual({ unit: "l", needed: 1, have: 2, toBuy: 0 });
    expect(ids(out.toBuy)).not.toContain("onion");
  });

  it("treats exactly enough as covered", () => {
    const out = buildShoppingList({
      entries,
      recipes,
      ingredients,
      pantry: [{ ingredientId: "flour", baseQuantity: 500 }],
    });
    expect(ids(out.covered)).toEqual(["flour"]);
  });

  it("ignores junk pantry quantities", () => {
    const out = buildShoppingList({
      entries,
      recipes,
      ingredients,
      pantry: [
        { ingredientId: "flour", baseQuantity: -50 },
        { ingredientId: "flour", baseQuantity: NaN },
        { ingredientId: "flour", baseQuantity: 0 },
      ],
    });
    expect(find(out.toBuy, "flour").have).toBe(0);
  });

  describe("expiry", () => {
    const one = [{ recipeId: "pancakes", servings: 4 }]; // flour 250
    const pantry: PantryBatchInput[] = [
      { ingredientId: "flour", baseQuantity: 300, expirationDate: new Date("2026-10-09T00:00:00Z") },
      { ingredientId: "flour", baseQuantity: 100, expirationDate: new Date("2026-10-10T00:00:00Z") },
      { ingredientId: "flour", baseQuantity: 50 },
    ];

    it("ignores batches already expired at asOf; a batch expiring exactly at asOf still counts", () => {
      const out = buildShoppingList({
        entries: one,
        recipes,
        ingredients,
        pantry,
        options: { asOf: new Date("2026-10-10T00:00:00Z") },
      });
      const flour = find(out.toBuy, "flour");
      expect(flour.have).toBe(150);
      expect(flour.toBuy).toBe(100);
    });

    it("counts everything when asOf is omitted", () => {
      const out = buildShoppingList({ entries: one, recipes, ingredients, pantry });
      expect(ids(out.covered)).toContain("flour");
      expect(find(out.covered, "flour").have).toBe(450);
    });

    it("treats null expiry like no expiry", () => {
      const out = buildShoppingList({
        entries: one,
        recipes,
        ingredients,
        pantry: [{ ingredientId: "flour", baseQuantity: 250, expirationDate: null }],
        options: { asOf: new Date("2030-01-01T00:00:00Z") },
      });
      expect(ids(out.covered)).toContain("flour");
    });
  });
});

describe("staples and optional lines", () => {
  const entries = [{ recipeId: "pancakes", servings: 4 }];

  it("keeps staples off the list by default but reports them", () => {
    const out = buildShoppingList({ entries, recipes, ingredients, pantry: [] });
    expect(ids(out.toBuy)).not.toContain("salt");
    expect(ids(out.staples)).toEqual(["salt"]);
    expect(find(out.staples, "salt").needed).toBe(2);
    expect(find(out.staples, "salt").isStaple).toBe(true);
  });

  it("treats staples as normal with includeStaples", () => {
    const out = buildShoppingList({
      entries,
      recipes,
      ingredients,
      pantry: [{ ingredientId: "salt", baseQuantity: 1 }],
      options: { includeStaples: true },
    });
    expect(out.staples).toEqual([]);
    const salt = find(out.toBuy, "salt");
    expect(salt.have).toBe(1);
    expect(salt.toBuy).toBe(1);
  });

  it("skips optional lines by default and includes them on request", () => {
    const without = buildShoppingList({ entries, recipes, ingredients, pantry: [] });
    const allIds = [...ids(without.toBuy), ...ids(without.covered), ...ids(without.staples)];
    expect(allIds).not.toContain("parsley");

    const withOptional = buildShoppingList({
      entries,
      recipes,
      ingredients,
      pantry: [],
      options: { includeOptional: true },
    });
    expect(find(withOptional.toBuy, "parsley").needed).toBe(5);
    expect(withOptional.toBuy[0]?.ingredientId).toBe("parsley"); // produce comes first
  });
});

describe("warnings", () => {
  it("warns about a deleted recipe once and keeps going", () => {
    const out = buildShoppingList({
      entries: [
        { recipeId: "ghost", servings: 2 },
        { recipeId: "ghost", servings: 4 },
        { recipeId: "pancakes", servings: 4 },
      ],
      recipes,
      ingredients,
      pantry: [],
    });
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0]?.code).toBe("missing_recipe");
    expect(out.warnings[0]?.recipeId).toBe("ghost");
    expect(find(out.toBuy, "flour").needed).toBe(250);
  });

  it("warns about an unknown ingredient once across recipes and leaves it out", () => {
    const r = new Map<string, RecipeInput>([
      ["a", { servings: 1, ingredients: [{ ingredientId: "mystery", baseQuantity: 5 }, { ingredientId: "flour", baseQuantity: 1 }] }],
      ["b", { servings: 1, ingredients: [{ ingredientId: "mystery", baseQuantity: 7 }] }],
    ]);
    const out = buildShoppingList({
      entries: [
        { recipeId: "a", servings: 1 },
        { recipeId: "b", servings: 1 },
      ],
      recipes: r,
      ingredients,
      pantry: [],
    });
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0]?.code).toBe("missing_ingredient");
    expect(out.warnings[0]?.ingredientId).toBe("mystery");
    expect(ids(out.toBuy)).toEqual(["flour"]);
  });

  it("skips entries with bad servings, and recipes with bad servings", () => {
    const r = new Map<string, RecipeInput>([
      ...recipes,
      ["broken", { servings: 0, ingredients: [{ ingredientId: "flour", baseQuantity: 10 }] }],
    ]);
    const out = buildShoppingList({
      entries: [
        { recipeId: "pancakes", servings: 0 },
        { recipeId: "pancakes", servings: -2 },
        { recipeId: "pancakes", servings: NaN },
        { recipeId: "broken", servings: 2 },
        { recipeId: "omelette", servings: 2 },
      ],
      recipes: r,
      ingredients,
      pantry: [],
    });
    expect(out.warnings.map((w) => w.code)).toEqual([
      "invalid_servings",
      "invalid_servings",
      "invalid_servings",
      "invalid_servings",
    ]);
    expect(ids(out.toBuy).sort()).toEqual(["egg", "milk", "onion"]);
  });
});

describe("display units and rounding", () => {
  function single(
    ingredientId: string,
    baseQuantity: number,
    options: Parameters<typeof buildShoppingList>[0]["options"] = undefined,
    pantry: PantryBatchInput[] = []
  ): ShoppingItem {
    const out = buildShoppingList({
      entries: [{ recipeId: "one", servings: 1 }],
      recipes: new Map([["one", { servings: 1, ingredients: [{ ingredientId, baseQuantity }] }]]),
      ingredients,
      pantry,
      options,
    });
    return out.toBuy[0] ?? find(out.covered, ingredientId);
  }

  it("metric ladder: g -> kg, ml -> l", () => {
    expect(single("flour", 500).display).toMatchObject({ unit: "g", needed: 500 });
    expect(single("flour", 1500).display).toMatchObject({ unit: "kg", needed: 1.5, toBuy: 1.5 });
    expect(single("milk", 999).display).toMatchObject({ unit: "ml", needed: 999 });
    expect(single("milk", 1000).display).toMatchObject({ unit: "l", needed: 1 });
  });

  it("us ladder: oz -> lb, tsp -> tbsp -> cup", () => {
    const us = { unitSystem: "us" as const };
    expect(single("flour", 100, us).display).toMatchObject({ unit: "oz", needed: 3.53 });
    expect(single("flour", 500, us).display).toMatchObject({ unit: "lb", needed: 1.11 });
    expect(single("milk", 5, us).display).toMatchObject({ unit: "tsp", needed: 1.02 });
    expect(single("milk", 30, us).display).toMatchObject({ unit: "tbsp", needed: 2.03 });
    expect(single("milk", 100, us).display).toMatchObject({ unit: "cup", needed: 0.43 });
  });

  it("counts are always pieces, in either system", () => {
    expect(single("egg", 3).display.unit).toBe("piece");
    expect(single("egg", 3, { unitSystem: "us" }).display.unit).toBe("piece");
  });

  it("rounds needed and toBuy up, have down, and never touches the exact base numbers", () => {
    const flour = single("flour", 125.3918, undefined, [{ ingredientId: "flour", baseQuantity: 40.7 }]);
    expect(flour.needed).toBe(125.3918);
    expect(flour.have).toBe(40.7);
    expect(flour.toBuy).toBe(84.6918);
    expect(flour.display).toEqual({ unit: "g", needed: 126, have: 40, toBuy: 85 });
  });

  it("rounds partial pieces up, because you can't buy 0.2 of an onion", () => {
    const onion = single("onion", 2.2);
    expect(onion.display).toEqual({ unit: "piece", needed: 3, have: 0, toBuy: 3 });
  });

  it("does not let floating-point noise bump the display up", () => {
    const r = new Map<string, RecipeInput>([
      ["n", { servings: 1, ingredients: [{ ingredientId: "flour", baseQuantity: 0.1 }, { ingredientId: "flour", baseQuantity: 0.2 }] }],
    ]);
    const out = buildShoppingList({
      entries: [{ recipeId: "n", servings: 1 }],
      recipes: r,
      ingredients,
      pantry: [],
    });
    const flour = find(out.toBuy, "flour");
    expect(flour.needed).toBe(0.3);
    expect(flour.display.needed).toBe(0.3);
  });

  it("never shows -0", () => {
    const item = single("milk", 1000, undefined, [{ ingredientId: "milk", baseQuantity: 5000 }]);
    expect(Object.is(item.display.toBuy, 0)).toBe(true);
  });
});

describe("ordering and grouping", () => {
  const cats = new Map<string, IngredientInfo>([
    ["a", info("zucchini", "count", { category: "produce" })],
    ["b", info("Apple", "count", { category: "produce" })],
    ["c", info("chicken", "mass", { category: "meat" })],
    ["d", info("rice", "mass", { category: "pantry" })],
    ["e", info("mystery", "mass", { category: "zzz-new-aisle" })],
    ["f", info("no category", "mass")],
    ["g", info("butter", "mass", { category: "dairy" })],
  ]);
  const r = new Map<string, RecipeInput>([
    [
      "all",
      {
        servings: 1,
        ingredients: ["a", "b", "c", "d", "e", "f", "g"].map((ingredientId) => ({
          ingredientId,
          baseQuantity: 1,
        })),
      },
    ],
  ]);
  const out = buildShoppingList({
    entries: [{ recipeId: "all", servings: 1 }],
    recipes: r,
    ingredients: cats,
    pantry: [],
  });

  it("orders by aisle, then A-Z ignoring case; unknown aisles go last", () => {
    expect(out.toBuy.map((i) => i.name)).toEqual([
      "Apple",
      "zucchini",
      "chicken",
      "butter",
      "rice",
      "no category", // "other" is a known aisle
      "mystery", // unknown aisle comes after all known ones
    ]);
  });

  it("defaults a missing category to other", () => {
    expect(find(out.toBuy, "f").category).toBe("other");
  });

  it("groupByAisle groups in walking order and skips empty aisles", () => {
    const groups = groupByAisle(out.toBuy);
    expect(groups.map((g) => g.category)).toEqual([
      "produce",
      "meat",
      "dairy",
      "pantry",
      "other",
      "zzz-new-aisle",
    ]);
    expect(groups[0]?.items.map((i) => i.name)).toEqual(["Apple", "zucchini"]);
  });

  it("groupByAisle copes with unsorted input", () => {
    const shuffled = [...out.toBuy].reverse();
    expect(groupByAisle(shuffled).map((g) => g.category)).toEqual([
      "produce",
      "meat",
      "dairy",
      "pantry",
      "other",
      "zzz-new-aisle",
    ]);
  });
});

describe("carryOverChecked", () => {
  it("keeps previous check marks and starts new items unchecked", () => {
    const next = [{ ingredientId: "a" }, { ingredientId: "b" }, { ingredientId: "c" }];
    const previous = [
      { ingredientId: "a", checked: true },
      { ingredientId: "b", checked: false },
      { ingredientId: "gone", checked: true },
    ];
    expect(carryOverChecked(next, previous)).toEqual([
      { ingredientId: "a", checked: true },
      { ingredientId: "b", checked: false },
      { ingredientId: "c", checked: false },
    ]);
  });

  it("copes with no previous list", () => {
    expect(carryOverChecked([{ ingredientId: "a" }], [])).toEqual([
      { ingredientId: "a", checked: false },
    ]);
  });
});

describe("purity", () => {
  it("does not mutate its inputs", () => {
    const entries = Object.freeze([Object.freeze({ recipeId: "pancakes", servings: 8 })]);
    const pantry = Object.freeze([Object.freeze({ ingredientId: "flour", baseQuantity: 100 })]);
    const run = () => buildShoppingList({ entries, recipes, ingredients, pantry });
    expect(run()).toEqual(run());
  });
});
