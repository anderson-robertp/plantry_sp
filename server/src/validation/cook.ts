import { z } from "zod";
import { objectIdSchema } from "./common.js";
import { isoDateSchema } from "./mealPlan.js";

/**
 * POST /recipes/:recipeId/cook. Every field is optional: an empty body means "I cooked this, the
 * way the recipe is written".
 */
export const cookRecipeInput = z
  .object({
    /** How many servings were actually made. Defaults to the plan entry's, else the recipe's. */
    servings: z.number().positive().max(100).optional(),
    /** Link this cook to a meal-plan entry, which marks that entry cooked. Send both or neither. */
    planId: objectIdSchema.optional(),
    entryId: objectIdSchema.optional(),
    /** Count the recipe's optional lines too. Default false. */
    includeOptional: z.boolean().optional(),
    /**
     * The household's calendar day ("YYYY-MM-DD"). Decides which pantry batches count as expired.
     * Defaults to today in UTC, which can be a day off in the evening in the Americas.
     */
    today: isoDateSchema.optional(),
  })
  .refine((b) => (b.planId === undefined) === (b.entryId === undefined), {
    message: "Send planId and entryId together, or neither",
    path: ["entryId"],
  });

export const cookRecipeParams = z.object({ recipeId: objectIdSchema });
export const cookParams = z.object({ cookId: objectIdSchema });

export const listCookLogQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CookRecipeInput = z.infer<typeof cookRecipeInput>;
export type ListCookLogQuery = z.infer<typeof listCookLogQuery>;
