import { GlobalRecipe } from "../models/globalRecipe.js";
import { Recipe } from "../models/recipe.js";
import { NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import { escapeRegExp } from "../utils/text.js";
import type {
  CreateRecipeInput,
  ListRecipesQuery,
  UpdateRecipeInput,
} from "../validation/recipe.js";
import { loadIngredientMap } from "./ingredientLookup.js";
import { resolveIngredientLines, type LineInput } from "./resolve.js";

/** List view skips the heavy fields (ingredients, steps); fetch one recipe for those. */
const LIST_FIELDS =
  "name description servings tags prepTimeMinutes cookTimeMinutes imageUrl sourceRecipeId updatedAt";

/** What the UI needs to render "2 cups flour" without a second request. */
const INGREDIENT_FIELDS = "name category defaultUnit baseUnitType";

async function buildLines(lines: readonly LineInput[], householdId: string | null) {
  const ingredients = await loadIngredientMap(
    lines.map((l) => l.ingredientId),
    householdId
  );
  return resolveIngredientLines(lines, ingredients);
}

/**
 * A household's recipes, most recently updated first.
 * Filters: name contains `search` (case-insensitive), has `tag`, uses `ingredientId`.
 */
export async function listRecipes(householdId: string, query: ListRecipesQuery) {
  const { search, tag, ingredientId, page, limit } = query;

  const find = Recipe.find({ householdId });
  if (search) find.where({ name: { $regex: escapeRegExp(search), $options: "i" } });
  if (tag) find.where({ tags: tag });
  if (ingredientId) find.where({ "ingredients.ingredientId": ingredientId });

  const [items, total] = await Promise.all([
    find
      .select(LIST_FIELDS)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Recipe.countDocuments(find.getFilter()),
  ]);

  return { items, page, limit, total };
}

/** One household recipe, with each line's ingredient populated (name, category, default unit). */
export async function getRecipe(householdId: string, recipeId: string) {
  const recipe = await Recipe.findOne({ _id: recipeId, householdId }).populate(
    "ingredients.ingredientId",
    INGREDIENT_FIELDS
  );
  if (!recipe) throw new NotFoundError("Recipe not found");
  return recipe;
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

export async function deleteRecipe(householdId: string, recipeId: string) {
  const deleted = await Recipe.findOneAndDelete({ _id: recipeId, householdId });
  if (!deleted) throw new NotFoundError("Recipe not found");
}

/** Admin/seed use only: global recipes may reference global ingredients only. */
export async function createGlobalRecipe(input: CreateRecipeInput) {
  const { ingredients: lines, ...fields } = input;
  const ingredients = await buildLines(lines, null);
  return GlobalRecipe.create({ ...omitUndefined(fields), ingredients });
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
