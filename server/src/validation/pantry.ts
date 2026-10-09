import { z } from "zod";
import { LOCATIONS } from "../utils/constants.js";
import { objectIdSchema, quantitySchema, unitSchema } from "./common.js";

const pantryBody = z.object({
  ingredientId: objectIdSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  // Accepts ISO strings like "2026-10-20"; invalid dates fail validation.
  expirationDate: z.coerce.date().optional(),
  // Mongoose defaults this to "pantry".
  location: z.enum(LOCATIONS).optional(),
});

export const createPantryItemInput = pantryBody;

/**
 * The ingredient of an existing row can't change (delete and re-add instead).
 * Changing quantity or unit recomputes baseQuantity.
 */
export const updatePantryItemInput = pantryBody
  .omit({ ingredientId: true })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update",
  });

export type CreatePantryItemInput = z.infer<typeof createPantryItemInput>;
export type UpdatePantryItemInput = z.infer<typeof updatePantryItemInput>;

/** For routes like DELETE /pantry/:pantryItemId */
export const pantryItemParams = z.object({ pantryItemId: objectIdSchema });

/** GET /pantry?location=fridge */
export const listPantryQuery = z.object({ location: z.enum(LOCATIONS).optional() });