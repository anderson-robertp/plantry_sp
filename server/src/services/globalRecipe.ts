import { GlobalRecipe } from "../models/globalRecipe.js";
import { NotFoundError } from "../utils/errors.js";
import { escapeRegExp } from "../utils/text.js";
import type { ListRecipesQuery } from "../validation/recipe.js";

/** List view skips the heavy fields (ingredients, steps); fetch one recipe for those. */
const LIST_FIELDS = "name description servings tags prepTimeMinutes cookTimeMinutes imageUrl";

/** What the UI needs to render "2 cups flour" without a second request. */
const INGREDIENT_FIELDS = "name category defaultUnit baseUnitType";

/**
 * Browse the global catalog (read-only, shared by every household), A to Z.
 * Filters: name contains `search` (case-insensitive), has `tag`, uses `ingredientId`.
 * Same query shape and response shape as the household recipe list.
 */
export async function listGlobalRecipes(query: ListRecipesQuery) {
  const { search, tag, ingredientId, page, limit } = query;

  const find = GlobalRecipe.find();
  if (search) find.where({ name: { $regex: escapeRegExp(search), $options: "i" } });
  if (tag) find.where({ tags: tag });
  if (ingredientId) find.where({ "ingredients.ingredientId": ingredientId });

  const [items, total] = await Promise.all([
    find
      .select(LIST_FIELDS)
      // _id as a tie-breaker keeps paging stable when two recipes share a name
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    GlobalRecipe.countDocuments(find.getFilter()),
  ]);

  return { items, page, limit, total };
}

/** One catalog recipe, with each line's ingredient populated (name, category, default unit). */
export async function getGlobalRecipe(globalRecipeId: string) {
  const recipe = await GlobalRecipe.findById(globalRecipeId).populate(
    "ingredients.ingredientId",
    INGREDIENT_FIELDS
  );
  if (!recipe) throw new NotFoundError("Recipe not found");
  return recipe;
}
