import {
  buildShoppingList,
  type IngredientInfo,
  type PantryBatchInput,
  type RecipeInput,
  type ShoppingItem,
  type ShoppingListOptions,
  type ShoppingWarning,
} from "./buildShoppingList.js";

export interface MatchRecipe extends RecipeInput {
  id: string;
  name: string;
}

export interface MissingIngredient {
  ingredientId: string;
  name: string;
  category: string;
  /** Exact amounts in base units (g / ml / piece). */
  baseUnit: ShoppingItem["baseUnit"];
  needed: number;
  have: number;
  missing: number;
  /** The same amounts in one friendly unit. */
  display: ShoppingItem["display"];
}

export interface RecipeMatch {
  recipeId: string;
  name: string;
  servings: number;
  /** True when the pantry covers every ingredient the recipe needs. */
  canCook: boolean;
  /** Share of the recipe's ingredients the pantry fully covers, 0 to 1. */
  coverage: number;
  totalIngredients: number;
  haveCount: number;
  missing: MissingIngredient[];
  warnings: ShoppingWarning[];
}

export interface MatchInput {
  recipes: readonly MatchRecipe[];
  ingredients: ReadonlyMap<string, IngredientInfo>;
  pantry: readonly PantryBatchInput[];
  options?: ShoppingListOptions | undefined;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * How well does the pantry cover each recipe, made as written? Pure: it reuses the shopping-list
 * engine with one entry per recipe, so "missing" here means exactly what "to buy" means there
 * (staples and optional lines left out unless asked for, expired batches ignored via `asOf`).
 * A line is "covered" only if the pantry holds the full amount, so half a cup of what you need
 * a cup of is missing (the display shows what you have).
 *
 * Best matches first: cookable now, then highest coverage, then fewest missing, then A-Z.
 */
export function matchRecipes(input: MatchInput): RecipeMatch[] {
  const matches = input.recipes.map((recipe): RecipeMatch => {
    const result = buildShoppingList({
      entries: [{ recipeId: recipe.id, servings: recipe.servings }],
      recipes: new Map([[recipe.id, recipe]]),
      ingredients: input.ingredients,
      pantry: input.pantry,
      options: input.options,
    });

    const missing = result.toBuy.map(
      (item): MissingIngredient => ({
        ingredientId: item.ingredientId,
        name: item.name,
        category: item.category,
        baseUnit: item.baseUnit,
        needed: item.needed,
        have: item.have,
        missing: item.toBuy,
        display: item.display,
      })
    );
    const total = result.toBuy.length + result.covered.length;
    return {
      recipeId: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      // any warning (a deleted ingredient, bad servings) means the check is incomplete, so not "can cook"
      canCook: missing.length === 0 && result.warnings.length === 0,
      coverage: total === 0 ? 1 : round3(result.covered.length / total),
      totalIngredients: total,
      haveCount: result.covered.length,
      missing,
      warnings: result.warnings,
    };
  });

  return matches.sort(
    (a, b) =>
      Number(b.canCook) - Number(a.canCook) ||
      b.coverage - a.coverage ||
      a.missing.length - b.missing.length ||
      a.name.localeCompare(b.name)
  );
}
