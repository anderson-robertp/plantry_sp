import { PantryItem } from "../models/pantryItem.js";
import { Recipe } from "../models/recipe.js";
import { NotFoundError } from "../utils/errors.js";
import type { RecipeMatchQuery } from "../validation/recipeMatch.js";
import type { PantryBatchInput } from "./buildShoppingList.js";
import { loadIngredientInfoMap } from "./ingredientInfo.js";
import { matchRecipes, type MatchRecipe, type RecipeMatch } from "./recipeMatch.js";

async function score(householdId: string, docs: MatchRecipe[], query: RecipeMatchQuery): Promise<RecipeMatch[]> {
  if (docs.length === 0) return [];
  const ingredientIds = [...new Set(docs.flatMap((r) => r.ingredients.map((l) => l.ingredientId)))];
  const [ingredients, pantryDocs] = await Promise.all([
    loadIngredientInfoMap(ingredientIds, householdId),
    PantryItem.find({ householdId, ingredientId: { $in: ingredientIds } })
      .select("ingredientId baseQuantity expirationDate")
      .lean(),
  ]);
  const pantry: PantryBatchInput[] = pantryDocs.map((p) => ({
    ingredientId: String(p.ingredientId),
    baseQuantity: p.baseQuantity,
    expirationDate: p.expirationDate,
  }));
  const day = query.today ?? new Date().toISOString().slice(0, 10);
  return matchRecipes({
    recipes: docs,
    ingredients,
    pantry,
    options: {
      includeStaples: query.includeStaples ?? false,
      includeOptional: query.includeOptional ?? false,
      unitSystem: query.unitSystem ?? "metric",
      asOf: new Date(`${day}T00:00:00.000Z`),
    },
  });
}

const toMatchRecipe = (r: {
  _id: unknown;
  name: string;
  servings: number;
  ingredients: { ingredientId: unknown; baseQuantity: number; optional?: boolean | undefined }[];
}): MatchRecipe => ({
  id: String(r._id),
  name: r.name,
  servings: r.servings,
  ingredients: r.ingredients.map((l) => ({
    ingredientId: String(l.ingredientId),
    baseQuantity: l.baseQuantity,
    optional: l.optional,
  })),
});

/** Every recipe in the household, best pantry match first. */
export async function matchHouseholdRecipes(householdId: string, query: RecipeMatchQuery) {
  const docs = await Recipe.find({ householdId }).select("name servings ingredients").lean();
  const all = await score(householdId, docs.map(toMatchRecipe), query);
  const matches = query.canCookOnly ? all.filter((m) => m.canCook) : all;
  return {
    total: matches.length,
    cookableCount: all.filter((m) => m.canCook).length,
    matches: matches.slice(0, query.limit),
  };
}

/** One recipe: can I cook it, and what's missing? */
export async function recipeAvailability(householdId: string, recipeId: string, query: RecipeMatchQuery) {
  const doc = await Recipe.findOne({ _id: recipeId, householdId }).select("name servings ingredients").lean();
  if (!doc) throw new NotFoundError("Recipe not found");
  const [match] = await score(householdId, [toMatchRecipe(doc)], query);
  return match as RecipeMatch;
}
