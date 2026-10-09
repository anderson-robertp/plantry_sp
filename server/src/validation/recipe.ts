import { z } from "zod";
import { objectIdSchema, quantitySchema, unitSchema } from "./common.js";

/**
 * Note what is NOT here: `baseQuantity`. Clients never send it. The service
 * computes it from the ingredient's density, so it can't be spoofed or stale.
 * (Unknown keys are stripped by zod's default object behavior.)
 *
 * Defaults (steps, tags, optional) live in the Mongoose schemas on purpose:
 * zod defaults inside `.partial()` can silently overwrite data on updates.
 */
export const recipeIngredientInput = z.object({
  ingredientId: objectIdSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  originalText: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(300).optional(),
  group: z.string().trim().max(60).optional(),
  optional: z.boolean().optional(),
});

const recipeBody = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  servings: z.number().int().min(1).max(100),
  steps: z.array(z.string().trim().min(1).max(2000)).max(100).optional(),
  ingredients: z.array(recipeIngredientInput).min(1).max(200),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(30).optional(),
  prepTimeMinutes: z.number().int().min(0).max(100_000).optional(),
  cookTimeMinutes: z.number().int().min(0).max(100_000).optional(),
  sourceUrl: z.string().trim().url().optional(),
  imageUrl: z.string().trim().url().optional(),
});

/** Used for household recipes and (from admin/seed code) global recipes. */
export const createRecipeInput = recipeBody;

/**
 * PATCH semantics. If `ingredients` is present it REPLACES the whole list and
 * every baseQuantity is recomputed.
 */
export const updateRecipeInput = recipeBody
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update",
  });

export type RecipeIngredientInput = z.infer<typeof recipeIngredientInput>;
export type CreateRecipeInput = z.infer<typeof createRecipeInput>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeInput>;
