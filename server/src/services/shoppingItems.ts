import { ShoppingList } from "../models/shoppingList.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { customItemDoc, customPatchOps, generatedPatchOps } from "../utils/shoppingPatch.js";
import type {
  CreateCustomItemInput,
  UpdateCustomItemInput,
  UpdateGeneratedItemInput,
} from "../validation/shoppingItem.js";

export const MAX_CUSTOM_ITEMS = 200;

const NO_LIST = "No shopping list for this plan yet. Generate one first.";

/** Add something that isn't from a recipe. Survives regenerating the list. */
export async function addCustomItem(householdId: string, planId: string, input: CreateCustomItemInput) {
  const list = await ShoppingList.findOneAndUpdate(
    // the "slot 199 is empty" test makes the size limit atomic
    { householdId, planId, [`extraItems.${MAX_CUSTOM_ITEMS - 1}`]: { $exists: false } },
    { $push: { extraItems: customItemDoc(input) } },
    { new: true, runValidators: true }
  );
  if (list) return list;

  const exists = await ShoppingList.exists({ householdId, planId });
  if (!exists) throw new NotFoundError(NO_LIST);
  throw new AppError(`A list can hold at most ${MAX_CUSTOM_ITEMS} added items`, 409, "shopping_list_full", {
    limit: MAX_CUSTOM_ITEMS,
  });
}

export async function updateCustomItem(householdId: string, planId: string, itemId: string, patch: UpdateCustomItemInput) {
  const list = await ShoppingList.findOneAndUpdate(
    { householdId, planId, "extraItems._id": itemId },
    customPatchOps(patch),
    { new: true, runValidators: true }
  );
  if (!list) throw new NotFoundError("Item not found on this shopping list");
  return list;
}

export async function removeCustomItem(householdId: string, planId: string, itemId: string) {
  const list = await ShoppingList.findOneAndUpdate(
    { householdId, planId, "extraItems._id": itemId },
    { $pull: { extraItems: { _id: itemId } } },
    { new: true }
  );
  if (!list) throw new NotFoundError("Item not found on this shopping list");
  return list;
}

/** Tick, re-quantity or annotate an item that came from the plan. */
export async function updateGeneratedItem(
  householdId: string,
  planId: string,
  ingredientId: string,
  patch: UpdateGeneratedItemInput
) {
  const list = await ShoppingList.findOneAndUpdate(
    { householdId, planId, "items.ingredientId": ingredientId },
    generatedPatchOps(patch),
    { new: true, runValidators: true }
  );
  if (!list) throw new NotFoundError("Item not found on this shopping list");
  return list;
}

/** Drop an item you don't need. It comes back if the list is regenerated and the plan still needs it. */
export async function removeGeneratedItem(householdId: string, planId: string, ingredientId: string) {
  const list = await ShoppingList.findOneAndUpdate(
    { householdId, planId, "items.ingredientId": ingredientId },
    { $pull: { items: { ingredientId } } },
    { new: true }
  );
  if (!list) throw new NotFoundError("Item not found on this shopping list");
  return list;
}
