import { GlobalRecipe } from "../models/globalRecipe.js";
import { Recipe } from "../models/recipe.js";
import { NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import type { CreateRecipeInput, UpdateRecipeInput } from "../validation/recipe.js";
import { loadIngredientMap } from "./ingredientLookup.js";
import { resolveIngredientLines, type LineInput } from "./resolve.js";

async function buildLines(lines: readonly LineInput[], householdId: string | null) {
  const ingredients = await loadIngredientMap(
    lines.map((l) => l.ingredientId),
    householdId
  );
  return resolveIngredientLines(lines, ingredients);
}

/** Create a household recipe. Input is already validated by zod. */
export async function createRecipe(householdId: string, input: CreateRecipeInput) {
  const { ingredients: lines, ...fields } = input;
  const ingredients = await buildLines(lines, householdId);
  return Recipe.create({ ...omitUndefined(fields), householdId, ingredients });
}

/**
 * PATCH a household recipe. Always scoped by householdId, so one household
 * can't touch another's recipes even with a valid id.
 */
export async function updateRecipe(
  householdId: string,
  recipeId: string,
  input: UpdateRecipeInput
) {
  const { ingredients, ...fields } = input;
  const $set: Record<string, unknown> = omitUndefined(fields);
  if (ingredients) {
    $set.ingredients = await buildLines(ingredients, householdId);
  }

  const recipe = await Recipe.findOneAndUpdate(
    { _id: recipeId, householdId },
    { $set },
    { new: true, runValidators: true }
  );
  if (!recipe) throw new NotFoundError("Recipe not found");
  return recipe;
}

/** Admin/seed use only: global recipes may reference global ingredients only. */
export async function createGlobalRecipe(input: CreateRecipeInput) {
  const { ingredients: lines, ...fields } = input;
  const ingredients = await buildLines(lines, null);
  return GlobalRecipe.create({ ...omitUndefined(fields), ingredients  });
}

/**
 * Copy a global recipe into a household as an editable version.
 * Lines are copied as-is: they only reference global ingredients, which every
 * household can see, and baseQuantity depends only on the ingredient, so the
 * stored values stay valid.
 */
export async function saveGlobalRecipeToHousehold(householdId: string, globalRecipeId: string) {
  const source = await GlobalRecipe.findById(globalRecipeId).lean();
  if (!source) throw new NotFoundError("Recipe not found");

  const { _id, createdAt, updatedAt, __v, ...fields } = source;
  return Recipe.create({ ...fields, householdId, sourceRecipeId: _id });
}
