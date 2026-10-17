import { z } from "zod";
import { isoDateSchema } from "./mealPlan.js";

export const dashboardQuery = z.object({
  /** The household's calendar day ("YYYY-MM-DD"). Default: today in UTC, which can be a day off in the evening in the Americas. */
  today: isoDateSchema.optional(),
  /** "Expiring soon" means within this many days, counting today. */
  expiringWithinDays: z.coerce.number().int().min(1).max(30).default(7),
  /** How many days of upcoming meals to show, starting today. */
  upcomingDays: z.coerce.number().int().min(1).max(14).default(7),
});

export type DashboardQuery = z.infer<typeof dashboardQuery>;
