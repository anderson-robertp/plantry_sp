import { CookLog } from "../models/cookLog.js";
import { MealPlan } from "../models/mealPlan.js";
import { PantryItem } from "../models/pantryItem.js";
import { Recipe } from "../models/recipe.js";
import { ShoppingList } from "../models/shoppingList.js";
import type { DashboardQuery } from "../validation/dashboard.js";
import {
  addDays,
  listProgress,
  pickFocusPlan,
  recentCooks,
  toExpiryItems,
  upcomingMeals,
  type PantryRowInput,
  type PlanInput,
} from "./dashboardBuilder.js";
import { loadIngredientInfoMap } from "./ingredientInfo.js";
import { matchHouseholdRecipes } from "./recipeAvailability.js";

const LIST_CAP = 10;
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

/**
 * One call for the home screen: what's about to expire, this week's meals, shopping progress,
 * what was cooked lately, and how many recipes can be made right now.
 */
export async function getDashboard(householdId: string, query: DashboardQuery) {
  const today = query.today ?? new Date().toISOString().slice(0, 10);
  const soonEnd = addDays(today, query.expiringWithinDays - 1);
  const mealsEnd = addDays(today, query.upcomingDays - 1);

  const soonFilter = { householdId, baseQuantity: { $gt: 0 }, expirationDate: { $gte: day(today), $lte: day(soonEnd) } };
  const expiredFilter = { householdId, baseQuantity: { $gt: 0 }, expirationDate: { $lt: day(today) } };
  const pantryFields = "ingredientId quantity unit location expirationDate";

  const [soonRows, soonCount, expiredRows, expiredCount, pantryCount, planDocs, cookDocs, recipeCount, match] =
    await Promise.all([
      PantryItem.find(soonFilter).sort({ expirationDate: 1 }).limit(LIST_CAP).select(pantryFields).lean(),
      PantryItem.countDocuments(soonFilter),
      PantryItem.find(expiredFilter).sort({ expirationDate: -1 }).limit(LIST_CAP).select(pantryFields).lean(),
      PantryItem.countDocuments(expiredFilter),
      PantryItem.countDocuments({ householdId, baseQuantity: { $gt: 0 } }),
      // plans not yet finished (a household rarely has more than a handful)
      MealPlan.find({ householdId, endDate: { $gte: today } }).sort({ startDate: 1 }).limit(20).lean(),
      CookLog.find({ householdId, undoneAt: { $exists: false } }).sort({ cookedAt: -1, _id: -1 }).limit(5).lean(),
      Recipe.countDocuments({ householdId }),
      matchHouseholdRecipes(householdId, { today, limit: 1 }),
    ]);

  // names for pantry rows and planned recipes
  const ingredientIds = [...soonRows, ...expiredRows].map((r) => String(r.ingredientId));
  const recipeIds = [...new Set(planDocs.flatMap((p) => p.entries.filter((e) => e.date >= today && e.date <= mealsEnd).map((e) => String(e.recipeId))))];
  const [ingredients, recipeDocs] = await Promise.all([
    loadIngredientInfoMap(ingredientIds, householdId),
    recipeIds.length > 0 ? Recipe.find({ householdId, _id: { $in: recipeIds } }).select("name").lean() : [],
  ]);
  const recipeNames = new Map(recipeDocs.map((r) => [String(r._id), r.name]));

  const toRow = (r: (typeof soonRows)[number]): PantryRowInput | null =>
    r.expirationDate
      ? {
          id: String(r._id),
          name: ingredients.get(String(r.ingredientId))?.name ?? "Unknown ingredient",
          quantity: r.quantity,
          unit: r.unit,
          location: r.location,
          expirationDate: r.expirationDate,
        }
      : null;
  const rows = (docs: typeof soonRows) => docs.map(toRow).filter((r): r is PantryRowInput => r !== null);

  const plans: PlanInput[] = planDocs.map((p) => ({
    id: String(p._id),
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    entries: p.entries.map((e) => ({
      id: String(e._id),
      date: e.date,
      slot: e.slot,
      recipeId: String(e.recipeId),
      servings: e.servings,
      cookedAt: e.cookedAt,
    })),
  }));

  const focus = pickFocusPlan(plans, today);
  const list = focus ? await ShoppingList.findOne({ householdId, planId: focus.id }).select("items.checked extraItems.checked").lean() : null;

  const meals = upcomingMeals(plans, recipeNames, today, query.upcomingDays);

  return {
    today,
    pantry: {
      itemCount: pantryCount,
      expiringSoon: { withinDays: query.expiringWithinDays, count: soonCount, items: toExpiryItems(rows(soonRows), today) },
      expired: { count: expiredCount, items: toExpiryItems(rows(expiredRows), today).reverse() },
    },
    upcomingMeals: {
      fromDate: today,
      toDate: mealsEnd,
      plannedCount: meals.filter((m) => !m.cooked).length,
      cookedCount: meals.filter((m) => m.cooked).length,
      meals,
    },
    shoppingList: focus
      ? listProgress(focus, list ? { items: list.items ?? [], extraItems: list.extraItems ?? [] } : null)
      : null,
    recentCooks: recentCooks(
      cookDocs.map((c) => ({ id: String(c._id), recipeId: String(c.recipeId), recipeName: c.recipeName, servings: c.servings, cookedAt: c.cookedAt }))
    ),
    recipes: { count: recipeCount, cookableNow: match.cookableCount },
  };
}
