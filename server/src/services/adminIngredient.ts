import { Ingredient } from "../models/ingredient.js"
import { PantryItem } from "../models/pantryItem.js";
import { Recipe } from "../models/recipe.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import { buildAdminIngredientFilter } from "../utils/adminFilter.js";
import { normalizeName } from "../utils/text.js";
import type { AdminListIngredientsQuery } from "../validation/admin.js";
import { weightChangeProblem } from "../utils/weights.js";
import { packageUnitProblem } from "../validation/ingredient.js";
import type { CreateIngredientInput, UpdateIngredientInput } from "../validation/ingredient.js";

/** Aliases as stored: normalized, de-duplicated, and never repeating the ingredient's own name. */
function cleanAliases(aliases: readonly string[], normalizedName: string): string[] {
  return [...new Set(aliases.map(normalizeName))].filter((a) => a && a !== normalizedName);
}

/**
 * A shared name or alias may not match ANY other ingredient's name or alias, including a
 * household's own: otherwise that household would see two ingredients answering to one name.
 */
async function assertNamesFree(names: readonly string[], exceptId?: string) {
  const clash = await Ingredient.findOne({
    $or: [{ normalizedName: { $in: names } }, { aliases: { $in: names } }],
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  }).select("name householdId");
  if (clash) {
    throw new AppError(
      `"${clash.name}" already uses that name or alias${clash.householdId ? " (it belongs to a household)" : ""}`,
      409,
      "ingredient_exists",
      { household: Boolean(clash.householdId) }
    );
  }
}

async function findShared(ingredientId: string) {
  const ingredient = await Ingredient.findOne({ _id: ingredientId, householdId: null });
  if (!ingredient) throw new NotFoundError("Shared ingredient not found");
  return ingredient;
}

/** The shared catalog, A to Z. */
export async function adminListIngredients(query: AdminListIngredientsQuery) {
  const filter = buildAdminIngredientFilter(query);
  const [items, total] = await Promise.all([
    Ingredient.find(filter)
      .sort({ normalizedName: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Ingredient.countDocuments(filter),
  ]);
  return { items, page: query.page, limit: query.limit, total };
}

/** One shared ingredient, plus how much of the app already depends on it (across every household). */
export async function adminGetIngredient(ingredientId: string) {
  const ingredient = await findShared(ingredientId);
  const [recipes, pantry] = await Promise.all([
    Recipe.countDocuments({ "ingredients.ingredientId": ingredientId }),
    PantryItem.countDocuments({ ingredientId }),
  ]);
  return { ...ingredient.toObject(), usedBy: { recipes, pantry } };
}

export async function adminCreateIngredient(input: CreateIngredientInput) {
  const { aliases, category, ...rest } = input;
  const normalizedName = normalizeName(input.name);
  const cleaned = cleanAliases(aliases ?? [], normalizedName);
  await assertNamesFree([normalizedName, ...cleaned]);
  // no householdId: that is what makes it shared
  return Ingredient.create({ ...omitUndefined(rest), category: category ?? "other", normalizedName, aliases: cleaned });
}

/**
 * Descriptive fields (name, aisle, aliases, default unit, staple flag, package), plus adding a
 * weight (gramsPerMl, gramsPerPiece) when it is missing. How an ingredient is measured and any
 * weight already set stay fixed: every saved recipe and pantry row stores a quantity computed
 * from them, so changing them would quietly make those quantities wrong.
 */
export async function adminUpdateIngredient(ingredientId: string, input: UpdateIngredientInput) {
  const ingredient = await findShared(ingredientId);
  const { name, aliases, package: pkg, ...rest } = input;
  const patch: Record<string, unknown> = omitUndefined(rest);

  const weightProblem = weightChangeProblem(ingredient, rest);
  if (weightProblem) throw new AppError(weightProblem, 409, "weight_already_set");

  if (pkg === null) {
    ingredient.set("package", undefined);
  } else if (pkg !== undefined) {
    const problem = packageUnitProblem(pkg.unit, ingredient.baseUnitType);
    if (problem) throw new AppError(problem, 422, "invalid_package");
    patch.package = pkg;
  }

  if (name !== undefined || aliases !== undefined) {
    const normalizedName = name !== undefined ? normalizeName(name) : ingredient.normalizedName;
    const cleaned = cleanAliases(aliases ?? ingredient.aliases, normalizedName);
    await assertNamesFree([normalizedName, ...cleaned], ingredientId);
    if (name !== undefined) {
      patch.name = name;
      patch.normalizedName = normalizedName;
    }
    patch.aliases = cleaned;
  }

  ingredient.set(patch);
  return ingredient.save();
}
