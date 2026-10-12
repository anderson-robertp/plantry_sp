import { Types } from "mongoose";
import { Ingredient } from "../models/ingredient.js";
import { PantryItem } from "../models/pantryItem.js";
import { Recipe } from "../models/recipe.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import { escapeRegExp, normalizeName } from "../utils/text.js";
import type {
  CreateIngredientInput,
  ListIngredientsQuery,
  UpdateIngredientInput,
} from "../validation/ingredient.js";

/** `householdId: null` also matches documents where the field is missing (global ingredients). */
function visibleTo(householdId: string) {
  return { $in: [null, new Types.ObjectId(householdId)] };
}

/** Aliases as stored: normalized, de-duplicated, and never repeating the ingredient's own name. */
function cleanAliases(aliases: readonly string[], normalizedName: string): string[] {
  return [...new Set(aliases.map(normalizeName))].filter((a) => a && a !== normalizedName);
}

/**
 * A name or alias may not match another visible ingredient's name or alias (that would make
 * "scallion" resolve to two things). `exceptId` is the ingredient being edited.
 */
async function assertNamesFree(
  householdId: string,
  names: readonly string[],
  exceptId?: string
) {
  const clash = await Ingredient.findOne({
    householdId: visibleTo(householdId),
    $or: [{ normalizedName: { $in: names } }, { aliases: { $in: names } }],
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  }).select("name");
  if (clash) {
    throw new AppError(
      `"${clash.name}" already uses that name or alias`,
      409,
      "ingredient_exists"
    );
  }
}

/** Shared catalog plus the household's own, A to Z. Search matches names and aliases. */
export async function listIngredients(householdId: string, query: ListIngredientsQuery) {
  const { search, category, scope, page, limit } = query;

  const filter: Record<string, unknown> = {
    householdId:
      scope === "global"
        ? null
        : scope === "household"
          ? new Types.ObjectId(householdId)
          : visibleTo(householdId),
  };
  if (search) {
    const needle = { $regex: escapeRegExp(normalizeName(search)) };
    filter.$or = [{ normalizedName: needle }, { aliases: needle }];
  }
  if (category) filter.category = category;

  const [items, total] = await Promise.all([
    Ingredient.find(filter)
      .sort({ normalizedName: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Ingredient.countDocuments(filter),
  ]);
  return { items, page, limit, total };
}

export async function getIngredient(householdId: string, ingredientId: string) {
  const ingredient = await Ingredient.findOne({
    _id: ingredientId,
    householdId: visibleTo(householdId),
  });
  if (!ingredient) throw new NotFoundError("Ingredient not found");
  return ingredient;
}

export async function createIngredient(householdId: string, input: CreateIngredientInput) {
  const { aliases, category, ...rest } = input;
  const normalizedName = normalizeName(input.name);
  const cleaned = cleanAliases(aliases ?? [], normalizedName);

  await assertNamesFree(householdId, [normalizedName, ...cleaned]);
  return Ingredient.create({
    ...omitUndefined(rest),
    category: category ?? "other",
    normalizedName,
    aliases: cleaned,
    householdId,
  });
}

/** Only a household's own ingredients can be changed; the shared catalog is read-only. */
async function findOwned(householdId: string, ingredientId: string) {
  const ingredient = await getIngredient(householdId, ingredientId);
  if (!ingredient.householdId) {
    throw new AppError(
      "Shared catalog ingredients can't be changed",
      403,
      "global_ingredient_readonly"
    );
  }
  return ingredient;
}

export async function updateIngredient(
  householdId: string,
  ingredientId: string,
  input: UpdateIngredientInput
) {
  const ingredient = await findOwned(householdId, ingredientId);
  const { name, aliases, ...rest } = input;

  const patch: Record<string, unknown> = omitUndefined(rest);

  // normalizedName and aliases must stay consistent with name, so recompute whenever either moves.
  if (name !== undefined || aliases !== undefined) {
    const normalizedName = name !== undefined ? normalizeName(name) : ingredient.normalizedName;
    const cleaned = cleanAliases(aliases ?? ingredient.aliases, normalizedName);

    await assertNamesFree(householdId, [normalizedName, ...cleaned], ingredientId);
    if (name !== undefined) {
      patch.name = name;
      patch.normalizedName = normalizedName;
    }
    patch.aliases = cleaned;
  }

  ingredient.set(patch);
  return ingredient.save();
}

/** Refuses while any recipe or pantry row still uses it, so nothing is left pointing at nothing. */
export async function deleteIngredient(householdId: string, ingredientId: string) {
  await findOwned(householdId, ingredientId);

  const [recipe, pantry] = await Promise.all([
    Recipe.exists({ householdId, "ingredients.ingredientId": ingredientId }),
    PantryItem.exists({ householdId, ingredientId }),
  ]);
  if (recipe || pantry) {
    throw new AppError(
      "Ingredient is still used by a recipe or pantry item",
      409,
      "ingredient_in_use",
      { usedByRecipe: Boolean(recipe), usedByPantry: Boolean(pantry) }
    );
  }
  await Ingredient.deleteOne({ _id: ingredientId, householdId });
}
