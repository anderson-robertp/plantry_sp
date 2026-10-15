import { MealPlan } from "../models/mealPlan.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { extendRange } from "../utils/planRange.js";
import type { MealPlanEntryInput, UpdateMealPlanEntryInput } from "../validation/mealPlan.js";
import { assertRecipesBelongToHousehold } from "./mealPlan.js";

async function loadPlan(householdId: string, planId: string) {
  const plan = await MealPlan.findOne({ _id: planId, householdId });
  if (!plan) throw new NotFoundError("Meal plan not found");
  return plan;
}

/** Stretch the plan to include `date` (or refuse if that would make it too long). */
function stretchTo(plan: { startDate: string; endDate: string }, date: string) {
  const next = extendRange(plan, date);
  if (!next) {
    throw new AppError(
      "Adding that day would make the plan too long. Start a new plan for it instead.",
      422,
      "invalid_plan"
    );
  }
  plan.startDate = next.startDate;
  plan.endDate = next.endDate;
}

/** Add one meal. A date outside the plan stretches the plan to cover it. */
export async function addPlanEntry(householdId: string, planId: string, input: MealPlanEntryInput) {
  const plan = await loadPlan(householdId, planId);
  await assertRecipesBelongToHousehold(householdId, [input]);

  stretchTo(plan, input.date);
  plan.entries.push({ date: input.date, slot: input.slot, recipeId: input.recipeId, servings: input.servings } as never);
  return plan.save();
}

/**
 * Change one meal: move it to another day or slot, swap the recipe, change the servings. A cooked
 * meal is part of the record, so it can't be edited until the cook is undone.
 */
export async function updatePlanEntry(
  householdId: string,
  planId: string,
  entryId: string,
  patch: UpdateMealPlanEntryInput
) {
  const plan = await loadPlan(householdId, planId);
  const entry = plan.entries.find((e) => String(e._id) === entryId);
  if (!entry) throw new NotFoundError("Plan entry not found");
  if (entry.cookedAt) {
    throw new AppError("That meal was cooked. Undo the cook before changing it.", 409, "entry_cooked");
  }

  if (patch.recipeId !== undefined) await assertRecipesBelongToHousehold(householdId, [{ recipeId: patch.recipeId }]);
  if (patch.date !== undefined) stretchTo(plan, patch.date);

  if (patch.date !== undefined) entry.date = patch.date;
  if (patch.slot !== undefined) entry.slot = patch.slot;
  if (patch.recipeId !== undefined) entry.recipeId = patch.recipeId as never;
  if (patch.servings !== undefined) entry.servings = patch.servings;
  return plan.save();
}

/** Remove one meal. Allowed even if it was cooked; the cook history is kept either way. */
export async function removePlanEntry(householdId: string, planId: string, entryId: string) {
  const res = await MealPlan.updateOne({ _id: planId, householdId }, { $pull: { entries: { _id: entryId } } });
  if (res.matchedCount === 0) throw new NotFoundError("Meal plan not found");
  if (res.modifiedCount === 0) throw new NotFoundError("Plan entry not found");
}
