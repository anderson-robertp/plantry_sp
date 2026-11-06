import { describe, expect, it } from "@jest/globals";
import type { PageRecipe } from "../utils/recipePage.js";
import { buildPreview, type CatalogIngredient } from "./recipeImportCore.js";

const ing = (o: Partial<CatalogIngredient> & { _id: string; name: string }): CatalogIngredient => ({
  normalizedName: o.name.toLowerCase(),
  aliases: [],
  householdId: null,
  baseUnitType: "mass",
  ...o,
});

const catalog: CatalogIngredient[] = [
  ing({ _id: "flour", name: "All-purpose flour", aliases: ["flour"], baseUnitType: "mass", gramsPerMl: 0.53 }),
  ing({ _id: "egg", name: "Egg", baseUnitType: "count", gramsPerPiece: 50 }),
  ing({ _id: "salt", name: "Salt", baseUnitType: "mass" }),
  ing({ _id: "ppb", name: "Pork and beans", baseUnitType: "mass", package: { label: "can", size: 430, unit: "g" } }),
  ing({ _id: "milk", name: "Milk", baseUnitType: "volume" }),
];

const page: PageRecipe = {
  name: "Test",
  servings: 4,
  servingsGuessed: false,
  steps: ["Mix."],
  tags: ["dinner"],
  ingredientLines: ["2 cups all-purpose flour", "2 large eggs", "Kosher salt, to taste", "2 cans pork and beans", "1 cup milk", "1 tsp saffron", "3 cups flour"],
};

describe("buildPreview", () => {
  const p = buildPreview(page, "https://example.com/r", catalog);
  const line = (i: number) => p.lines[i]!;

  it("carries the recipe fields through", () => {
    expect(p).toMatchObject({ sourceUrl: "https://example.com/r", name: "Test", servings: 4, steps: ["Mix."], tags: ["dinner"] });
    expect(p.lines).toHaveLength(7);
  });

  it("matches ingredients and keeps the parsed amounts", () => {
    expect(line(0)).toMatchObject({ quantity: 2, unit: "cup", match: { ingredient: { _id: "flour" }, confidence: "exact", unitFits: true } });
    expect(line(1)).toMatchObject({ quantity: 2, unit: "piece", match: { ingredient: { _id: "egg" }, unitFits: true } });
    expect(line(2)).toMatchObject({ quantity: null, match: { ingredient: { _id: "salt" }, confidence: "close" } });
    expect(line(4)).toMatchObject({ quantity: 1, unit: "cup", match: { ingredient: { _id: "milk" } } });
  });

  it("uses the package size when a line counts cans", () => {
    expect(line(3)).toMatchObject({ quantity: 860, unit: "g", match: { ingredient: { _id: "ppb" }, unitFits: true } });
  });

  it("leaves unknown ingredients unmatched", () => {
    expect(line(5)).toMatchObject({ name: "saffron", match: null, suggestions: [] });
  });

  it("flags amounts that can't be converted for the matched ingredient", () => {
    const odd = buildPreview({ ...page, ingredientLines: ["2 eggs", "3 cups salt"] }, "u", [
      ing({ _id: "egg", name: "Egg", baseUnitType: "mass" }),
      ing({ _id: "salt", name: "Salt", baseUnitType: "mass" }),
    ]);
    expect(odd.lines[0]).toMatchObject({ match: { unitFits: false } });
    expect(odd.lines[1]).toMatchObject({ match: { unitFits: false } });
  });
});
