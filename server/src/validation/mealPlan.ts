import { z } from "zod";
import { MAX_PLAN_DAYS, MEAL_SLOTS, UNIT_SYSTEMS } from "../utils/mealPlanConstants.js";
import { objectIdSchema } from "./common.js";

/** "2026-10-20" must be a real day: rejects "2026-02-30" and "2026-13-01". */
function isRealDate(s: string): boolean {
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

function dayNumber(s: string): number {
  return Math.floor(Date.parse(`${s}T00:00:00Z`) / 86_400_000);
}

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(isRealDate, "Not a real calendar date");

export interface PlanShape {
  startDate: string;
  endDate: string;
  entries: readonly { date: string }[];
}

/**
 * Cross-field checks for a whole plan: dates in order, a sane length, and every entry inside the
 * range. Returns human-readable problems (empty = fine). Shared by the create schema and by the
 * update service, which has to merge with the stored plan before it can check.
 */
export function planDateIssues(plan: PlanShape): string[] {
  const start = dayNumber(plan.startDate);
  const end = dayNumber(plan.endDate);
  if (end < start) return ["startDate must be on or before endDate"];

  const issues: string[] = [];
  if (end - start + 1 > MAX_PLAN_DAYS) {
    issues.push(`A plan can span at most ${MAX_PLAN_DAYS} days`);
  }
  plan.entries.forEach((entry, i) => {
    const d = dayNumber(entry.date);
    if (d < start || d > end) {
      issues.push(`Entry ${i + 1}: ${entry.date} is outside ${plan.startDate} to ${plan.endDate}`);
    }
  });
  return issues;
}

export const mealPlanEntryInput = z.object({
  date: isoDateSchema,
  slot: z.enum(MEAL_SLOTS),
  recipeId: objectIdSchema,
  servings: z.number().positive().max(100),
});

const mealPlanBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  entries: z.array(mealPlanEntryInput).max(200),
});

export const createMealPlanInput = mealPlanBody.superRefine((plan, ctx) => {
  for (const message of planDateIssues(plan)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});

/**
 * PATCH semantics. `entries`, if present, REPLACES the whole list. The date-range checks run in
 * the service after merging with the stored plan (a patch may send only one of the dates).
 */
export const updateMealPlanInput = mealPlanBody
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update",
  });

export const mealPlanParams = z.object({ planId: objectIdSchema });

/** GET /meal-plans?from=2026-10-01&to=2026-10-31 : plans overlapping that window. */
export const listMealPlansQuery = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** POST body for generating a shopping list. Every field optional; send {} for defaults. */
export const generateShoppingListInput = z.object({
  includeStaples: z.boolean().optional(),
  includeOptional: z.boolean().optional(),
  unitSystem: z.enum(UNIT_SYSTEMS).optional(),
  ignoreExpired: z.boolean().optional(),
});

export const shoppingItemParams = z.object({
  planId: objectIdSchema,
  ingredientId: objectIdSchema,
});

export const checkShoppingItemInput = z.object({ checked: z.boolean() });

export type MealPlanEntryInput = z.infer<typeof mealPlanEntryInput>;
export type CreateMealPlanInput = z.infer<typeof createMealPlanInput>;
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanInput>;
export type ListMealPlansQuery = z.infer<typeof listMealPlansQuery>;
export type GenerateShoppingListInput = z.infer<typeof generateShoppingListInput>;
