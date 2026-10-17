import { z } from "zod";
import { INGREDIENT_CATEGORIES } from "../utils/constants.js";
import { objectIdSchema, unitSchema } from "./common.js";

const name = z.string().trim().min(1, "Name is required").max(100);
const quantity = z.number().positive().max(1_000_000);
const note = z.string().trim().max(200);
const atLeastOne = (o: object) => Object.values(o).some((v) => v !== undefined);

/** POST .../shopping-list/custom-items: something that isn't from a recipe. */
export const createCustomItemInput = z
  .object({
    name,
    category: z.enum(INGREDIENT_CATEGORIES).optional(),
    quantity: quantity.optional(),
    unit: unitSchema.optional(),
    note: note.optional(),
  })
  .refine((b) => b.unit === undefined || b.quantity !== undefined, {
    message: "A unit needs a quantity",
    path: ["unit"],
  });

/** PATCH .../custom-items/:itemId. Send only what changes; `null` clears quantity (and unit) or note. */
export const updateCustomItemInput = z
  .object({
    name: name.optional(),
    category: z.enum(INGREDIENT_CATEGORIES).optional(),
    quantity: quantity.nullable().optional(),
    unit: unitSchema.nullable().optional(),
    note: note.nullable().optional(),
    checked: z.boolean().optional(),
  })
  .refine(atLeastOne, { message: "Send at least one field to change" });

/**
 * PATCH .../items/:ingredientId, for an item generated from the plan. `quantity` and `unit` are
 * what to buy (say 2 packs instead of 340 g) and come together. Hand edits last until the list is
 * regenerated from the plan.
 */
export const updateGeneratedItemInput = z
  .object({
    checked: z.boolean().optional(),
    quantity: quantity.optional(),
    unit: unitSchema.optional(),
    note: note.nullable().optional(),
  })
  .refine(atLeastOne, { message: "Send at least one field to change" })
  .refine((b) => (b.quantity === undefined) === (b.unit === undefined), {
    message: "Send quantity and unit together",
    path: ["unit"],
  });

export const customItemParams = z.object({ planId: objectIdSchema, itemId: objectIdSchema });
export const generatedItemParams = z.object({ planId: objectIdSchema, ingredientId: objectIdSchema });

export type CreateCustomItemInput = z.infer<typeof createCustomItemInput>;
export type UpdateCustomItemInput = z.infer<typeof updateCustomItemInput>;
export type UpdateGeneratedItemInput = z.infer<typeof updateGeneratedItemInput>;
