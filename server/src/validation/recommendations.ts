import { z } from "zod";
import { objectIdSchema } from "./common.js";
import { isoDateSchema } from "./mealPlan.js";

/** GET /recommendations */
export const recommendationsQuery = z.object({
  /** Only this kind of dish (main, side, dessert...). */
  course: z.enum(["main", "side", "appetizer", "dessert", "drink"]).optional(),
  /** Leave out recipes that take longer than this. */
  maxMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  /** Recipes already in this plan are pushed to the bottom. */
  planId: objectIdSchema.optional(),
  /** The household's calendar day. Default: today in UTC. */
  today: isoDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});
export type RecommendationsQuery = z.infer<typeof recommendationsQuery>;
