import { Types } from "mongoose";
import { CookLog } from "../models/cookLog.js";
import { MealPlan } from "../models/mealPlan.js";
import { PantryItem } from "../models/pantryItem.js";
import { Recipe } from "../models/recipe.js";
import { RecipeFavorite } from "../models/recipeFavorite.js";
import { courseFromTags, rulesRecommender, type Candidate, type Recommender } from "../utils/recommender.js";
import type { RecommendationsQuery } from "../validation/recommendations.js";
import { loadIngredientInfoMap } from "./ingredientInfo.js";
import { matchHouseholdRecipes } from "./recipeAvailability.js";

const EXPIRES_WITHIN_DAYS = 3;
const DAY_MS = 86_400_000;
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

/**
 * Suggest recipes for the household. This function gathers the facts; `recommender` ranks them,
 * so a different engine (the R service, say) can be dropped in without touching the rest.
 */
export async function recommendRecipes(
  householdId: string,
  query: RecommendationsQuery,
  recommender: Recommender = rulesRecommender
) {
  const today = query.today ?? new Date().toISOString().slice(0, 10);
  const hid = new Types.ObjectId(householdId);
  const soonEnd = new Date(day(today).getTime() + EXPIRES_WITHIN_DAYS * DAY_MS);

  const [recipes, match, expiringRows, favRows, cookRows, plan] = await Promise.all([
    Recipe.find({ householdId }).select("name tags ingredients prepTimeMinutes cookTimeMinutes").lean(),
    matchHouseholdRecipes(householdId, { today, limit: 200 }),
    PantryItem.find({ householdId, baseQuantity: { $gt: 0 }, expirationDate: { $gte: day(today), $lte: soonEnd } })
      .select("ingredientId")
      .lean(),
    RecipeFavorite.find({ householdId: hid }).select("recipeId").lean(),
    CookLog.aggregate<{ _id: Types.ObjectId; last: Date }>([
      { $match: { householdId: hid, undoneAt: { $exists: false } } },
      { $group: { _id: "$recipeId", last: { $max: "$cookedAt" } } },
    ]),
    query.planId ? MealPlan.findOne({ _id: query.planId, householdId }).select("entries.recipeId").lean() : null,
  ]);

  const expiringIds = new Set(expiringRows.map((r) => String(r.ingredientId)));
  const names = expiringIds.size > 0 ? await loadIngredientInfoMap([...expiringIds], householdId) : new Map();
  const byRecipe = new Map(match.matches.map((m) => [m.recipeId, m]));
  const loved = new Map<string, number>();
  for (const f of favRows) loved.set(String(f.recipeId), (loved.get(String(f.recipeId)) ?? 0) + 1);
  const lastCooked = new Map(cookRows.map((r) => [String(r._id), r.last]));
  const inPlan = new Set((plan?.entries ?? []).map((e) => String(e.recipeId)));

  const candidates: Candidate[] = recipes.map((r) => {
    const id = String(r._id);
    const m = byRecipe.get(id);
    const last = lastCooked.get(id);
    const minutes = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0);
    return {
      recipeId: id,
      name: r.name,
      course: courseFromTags(r.tags),
      coverage: m?.coverage ?? 0,
      canCook: m?.canCook ?? false,
      missingCount: m?.missing.length ?? r.ingredients.length,
      expiringNames: [...new Set(r.ingredients.map((l) => String(l.ingredientId)).filter((i) => expiringIds.has(i)))].map(
        (i) => names.get(i)?.name ?? "an ingredient"
      ),
      lovedBy: loved.get(id) ?? 0,
      daysSinceCooked: last ? Math.max(0, Math.floor((day(today).getTime() - last.getTime()) / DAY_MS)) : null,
      inPlan: inPlan.has(id),
      totalMinutes: minutes > 0 ? minutes : null,
    };
  });

  const ranked = recommender.recommend(candidates, { course: query.course, maxMinutes: query.maxMinutes });
  return { total: ranked.length, recommendations: ranked.slice(0, query.limit) };
}
