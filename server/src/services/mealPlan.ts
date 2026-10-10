import { MealPlan } from "../models/mealPlan.js";
import { Recipe } from "../models/recipe.js";
import { ShoppingList } from "../models/shoppingList.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import {
  planDateIssues,
  type CreateMealPlanInput,
  type ListMealPlansQuery,
  type UpdateMealPlanInput,
} from "../validation/mealPlan.js";

/** Every recipe in a plan must belong to the household (save a global recipe first to plan it). */
async function assertRecipesBelongToHousehold(
  householdId: string,
  entries: readonly { recipeId: string }[]
) {
  const ids = [...new Set(entries.map((e) => e.recipeId))];
  if (ids.length === 0) return;

  const found = await Recipe.find({ _id: { $in: ids }, householdId }).select("_id").lean();
  const foundIds = new Set(found.map((r) => String(r._id)));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new AppError("The plan uses recipes that are not in this household", 422, "unknown_recipe", {
      recipeIds: missing,
    });
  }
}

export async function createMealPlan(householdId: string, input: CreateMealPlanInput) {
  await assertRecipesBelongToHousehold(householdId, input.entries);
  return MealPlan.create({ ...omitUndefined(input), householdId });
}

/** Plans overlapping the optional [from, to] window, soonest-starting last. */
export async function listMealPlans(householdId: string, query: ListMealPlansQuery) {
  const { from, to, page, limit } = query;

  const find = MealPlan.find({ householdId });
  if (from) find.where({ endDate: { $gte: from } });
  if (to) find.where({ startDate: { $lte: to } });

  const [items, total] = await Promise.all([
    find
      .sort({ startDate: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MealPlan.countDocuments(find.getFilter()),
  ]);

  return { items, page, limit, total };
}

export async function getMealPlan(householdId: string, planId: string) {
  const plan = await MealPlan.findOne({ _id: planId, householdId });
  if (!plan) throw new NotFoundError("Meal plan not found");
  return plan;
}

/**
 * PATCH a plan. `entries`, if sent, replaces the whole list. The result is checked as a whole
 * (dates in order, entries inside the range) because a patch may send only one of the dates.
 */
export async function updateMealPlan(
  householdId: string,
  planId: string,
  input: UpdateMealPlanInput
) {
  const plan = await MealPlan.findOne({ _id: planId, householdId });
  if (!plan) throw new NotFoundError("Meal plan not found");

  const merged = {
    startDate: input.startDate ?? plan.startDate,
    endDate: input.endDate ?? plan.endDate,
    entries:
      input.entries ??
      plan.entries.map((e) => ({
        date: e.date,
        slot: e.slot,
        recipeId: String(e.recipeId),
        servings: e.servings,
      })),
  };

  const issues = planDateIssues(merged);
  if (issues.length > 0) {
    throw new AppError(issues.join("; "), 422, "invalid_plan", { issues });
  }
  if (input.entries) {
    await assertRecipesBelongToHousehold(householdId, input.entries);
  }

  plan.set(omitUndefined(input));
  return plan.save();
}

/** Deleting a plan deletes its shopping list too. */
export async function deleteMealPlan(householdId: string, planId: string) {
  const deleted = await MealPlan.findOneAndDelete({ _id: planId, householdId });
  if (!deleted) throw new NotFoundError("Meal plan not found");
  await ShoppingList.deleteOne({ householdId, planId });
}
