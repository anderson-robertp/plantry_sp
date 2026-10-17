import { z } from "zod";
import { objectIdSchema } from "./common.js";
import { isoDateSchema } from "./mealPlan.js";

const boolFromQuery = z.enum(["true", "false"]).transform((v) => v === "true");

/** GET /recipes/match and GET /recipes/:recipeId/availability */
export const recipeMatchQuery = z.object({
  /** Only recipes the pantry fully covers. */
  canCookOnly: boolFromQuery.optional(),
  /** Count staples (salt, oil...) like any other ingredient. Default false. */
  includeStaples: boolFromQuery.optional(),
  /** Count optional recipe lines. Default false. */
  includeOptional: boolFromQuery.optional(),
  unitSystem: z.enum(["metric", "us"]).optional(),
  /** The household's calendar day, so batches expired before it are ignored. Default: today in UTC. */
  today: isoDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const recipeAvailabilityParams = z.object({ recipeId: objectIdSchema });

export type RecipeMatchQuery = z.infer<typeof recipeMatchQuery>;
