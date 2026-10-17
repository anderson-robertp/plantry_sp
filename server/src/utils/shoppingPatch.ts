import type { CreateCustomItemInput, UpdateCustomItemInput, UpdateGeneratedItemInput } from "../validation/shoppingItem.js";

/** The document for a new custom item. Unset fields are left out, not stored as undefined. */
export function customItemDoc(input: CreateCustomItemInput) {
  return {
    name: input.name,
    category: input.category ?? "other",
    checked: false,
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
}

type Fields = Record<string, unknown>;

/**
 * Turn "field -> new value" into Mongo update operators: undefined is skipped, null removes the
 * field, anything else is set. `prefix` points into an array element ("extraItems.$.").
 * Returns only the operators that have something in them (Mongo rejects an empty $set).
 */
export function patchOps(prefix: string, fields: Fields): { $set?: Fields; $unset?: Record<string, ""> } {
  const $set: Fields = {};
  const $unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === null) $unset[prefix + key] = "";
    else $set[prefix + key] = value;
  }
  return {
    ...(Object.keys($set).length > 0 ? { $set } : {}),
    ...(Object.keys($unset).length > 0 ? { $unset } : {}),
  };
}

/** Clearing the quantity clears its unit too; a unit alone is meaningless. */
export function customPatchOps(patch: UpdateCustomItemInput) {
  const clearsQuantity = patch.quantity === null;
  return patchOps("extraItems.$.", {
    name: patch.name,
    category: patch.category,
    quantity: patch.quantity,
    unit: clearsQuantity ? null : patch.unit,
    note: patch.note,
    checked: patch.checked,
  });
}

/** An edited quantity changes what's shown to buy and marks the item as hand-adjusted. */
export function generatedPatchOps(patch: UpdateGeneratedItemInput) {
  const adjusts = patch.quantity !== undefined;
  return patchOps("items.$.", {
    checked: patch.checked,
    note: patch.note,
    "display.toBuy": patch.quantity,
    "display.unit": patch.unit,
    adjusted: adjusts ? true : undefined,
  });
}
