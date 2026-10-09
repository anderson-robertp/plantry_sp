import { PantryItem } from "../models/pantryItem.js";
import type { Location } from "../utils/constants.js";
import { NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import type { CreatePantryItemInput, UpdatePantryItemInput } from "../validation/pantry.js";
import { loadIngredientMap } from "./ingredientLookup.js";
import { resolveBaseQuantity } from "./resolve.js";

/** All rows for a household (each row is a batch), newest first. */
export async function getPantryItems(householdId: string, filters: { location?: Location | undefined } = {}) {
  return PantryItem.find({
    householdId,
    ...(filters.location ? { location: filters.location } : {}),
  })
    .sort({ createdAt: -1 })
    .populate("ingredientId", "name category defaultUnit");
}

/**
 * Each call creates a new row (a "batch"). Two purchases of the same
 * ingredient with different expiry dates stay separate on purpose.
 */
export async function createPantryItem(householdId: string, input: CreatePantryItemInput) {
  const ingredients = await loadIngredientMap([input.ingredientId], householdId);
  const baseQuantity = resolveBaseQuantity(
    input.ingredientId,
    input.quantity,
    input.unit,
    ingredients
  );
  return PantryItem.create({ ...omitUndefined(input), householdId, baseQuantity });
}

export async function updatePantryItem(
  householdId: string,
  itemId: string,
  input: UpdatePantryItemInput
) {
  const item = await PantryItem.findOne({ _id: itemId, householdId });
  if (!item) throw new NotFoundError("Pantry item not found");

  // Recompute baseQuantity whenever quantity or unit changes, using the
  // current value for whichever one the client didn't send.
  if (input.quantity !== undefined || input.unit !== undefined) {
    const ingredientId = String(item.ingredientId);
    const ingredients = await loadIngredientMap([ingredientId], householdId);
    item.baseQuantity = resolveBaseQuantity(
      ingredientId,
      input.quantity ?? item.quantity,
      input.unit ?? item.unit,
      ingredients
    );
  }

  item.set(omitUndefined(input));
  return item.save();
}

export async function deletePantryItem(householdId: string, itemId: string) {
  const deleted = await PantryItem.findOneAndDelete({ _id: itemId, householdId });
  if (!deleted) throw new NotFoundError("Pantry item not found");
}