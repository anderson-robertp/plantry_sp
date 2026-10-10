import { MealPlan } from "../models/mealPlan.js";
import { PantryItem } from "../models/pantryItem.js";
import { Recipe } from "../models/recipe.js";
import { ShoppingList } from "../models/shoppingList.js";
import { NotFoundError } from "../utils/errors.js";
import type { UnitSystem } from "../utils/mealPlanConstants.js";
import type { GenerateShoppingListInput } from "../validation/mealPlan.js";
import {
  buildShoppingList,
  carryOverChecked,
  type PantryBatchInput,
  type RecipeInput,
} from "./buildShoppingList.js";
import { loadIngredientInfoMap } from "./ingredientInfo.js";

const unchecked = <T extends object>(items: readonly T[]) =>
  items.map((item) => ({ ...item, checked: false }));

/**
 * Build (or rebuild) the shopping list for a plan and save it. This is the only place that
 * touches the database for the list; the actual math lives in buildShoppingList.
 *
 * Regenerating replaces the list but keeps the check marks the shopper already made.
 */
export async function generateShoppingList(
  householdId: string,
  planId: string,
  input: GenerateShoppingListInput
) {
  const plan = await MealPlan.findOne({ _id: planId, householdId }).lean();
  if (!plan) throw new NotFoundError("Meal plan not found");

  const options: {
    includeStaples: boolean;
    includeOptional: boolean;
    unitSystem: UnitSystem;
    ignoreExpired: boolean;
  } = {
    includeStaples: input.includeStaples ?? false,
    includeOptional: input.includeOptional ?? false,
    unitSystem: input.unitSystem ?? "metric",
    ignoreExpired: input.ignoreExpired ?? true,
  };

  // recipes in the plan (household-scoped, so a plan can't pull in someone else's recipe)
  const entries = plan.entries.map((e) => ({ recipeId: String(e.recipeId), servings: e.servings }));
  const recipeIds = [...new Set(entries.map((e) => e.recipeId))];
  const recipeDocs =
    recipeIds.length > 0
      ? await Recipe.find({ _id: { $in: recipeIds }, householdId })
          .select("servings ingredients")
          .lean()
      : [];

  const recipes = new Map<string, RecipeInput>();
  for (const r of recipeDocs) {
    recipes.set(String(r._id), {
      servings: r.servings,
      ingredients: r.ingredients.map((line) => ({
        ingredientId: String(line.ingredientId),
        baseQuantity: line.baseQuantity,
        optional: line.optional,
      })),
    });
  }

  // ingredient labels and the household's stock for just the ingredients involved
  const ingredientIds = [
    ...new Set([...recipes.values()].flatMap((r) => r.ingredients.map((l) => l.ingredientId))),
  ];
  const [ingredients, pantryDocs] = await Promise.all([
    loadIngredientInfoMap(ingredientIds, householdId),
    ingredientIds.length > 0
      ? PantryItem.find({ householdId, ingredientId: { $in: ingredientIds } })
          .select("ingredientId baseQuantity expirationDate")
          .lean()
      : [],
  ]);

  const pantry: PantryBatchInput[] = pantryDocs.map((p) => ({
    ingredientId: String(p.ingredientId),
    baseQuantity: p.baseQuantity,
    expirationDate: p.expirationDate,
  }));

  // Expiry is a calendar date stored at UTC midnight, so compare against the plan's first day
  // at UTC midnight too.
  const asOf = options.ignoreExpired ? new Date(`${plan.startDate}T00:00:00.000Z`) : undefined;

  const result = buildShoppingList({
    entries,
    recipes,
    ingredients,
    pantry,
    options: {
      includeStaples: options.includeStaples,
      includeOptional: options.includeOptional,
      unitSystem: options.unitSystem,
      asOf,
    },
  });

  const previous = await ShoppingList.findOne({ householdId, planId }).select("items").lean();

  return ShoppingList.findOneAndUpdate(
    { householdId, planId },
    {
      $set: {
        generatedAt: new Date(),
        options,
        items: carryOverChecked(result.toBuy, previous?.items ?? []),
        covered: unchecked(result.covered),
        staples: unchecked(result.staples),
        warnings: result.warnings,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
}

export async function getShoppingList(householdId: string, planId: string) {
  const list = await ShoppingList.findOne({ householdId, planId });
  if (!list) throw new NotFoundError("No shopping list for this plan yet. Generate one first.");
  return list;
}

/** Tick or untick one item on the list. */
export async function setShoppingItemChecked(
  householdId: string,
  planId: string,
  ingredientId: string,
  checked: boolean
) {
  const list = await ShoppingList.findOneAndUpdate(
    { householdId, planId, "items.ingredientId": ingredientId },
    { $set: { "items.$.checked": checked } },
    { new: true }
  );
  if (!list) throw new NotFoundError("Item not found on this shopping list");
  return list;
}
