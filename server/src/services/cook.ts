import { CookLog } from "../models/cookLog.js";
import { MealPlan } from "../models/mealPlan.js";
import { PantryItem } from "../models/pantryItem.js";
import { Recipe } from "../models/recipe.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import type { Unit } from "../utils/units.js";
import type { CookRecipeInput, ListCookLogQuery } from "../validation/cook.js";
import { buildShoppingList, type RecipeInput } from "./buildShoppingList.js";
import { loadIngredientInfoMap } from "./ingredientInfo.js";
import { consumePipeline, restorePipeline } from "./pantryUpdates.js";
import { planConsumption, type PantryBatch } from "./planConsumption.js";
import type { Location } from "../utils/constants.js";
import mongoose, { Types } from "mongoose";

const EPS = 1e-6;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The pantry fields cooking reads. */
interface PantryRow {
  _id: unknown;
  ingredientId: unknown;
  quantity: number;
  unit: string;
  baseQuantity: number;
  expirationDate?: Date | null | undefined;
  location?: Location | undefined;
  createdAt?: Date | undefined;
}

/** One pantry batch (or part of one) that was used, as saved on the CookLog. */
interface ConsumedRecord {
  pantryItemId: Types.ObjectId;
  ingredientId: Types.ObjectId;
  baseQuantity: number;
  quantity: number;
  unit: Unit;
  expirationDate?: Date;
  location?: Location;
}

// ---- plan entries -------------------------------------------------------------------------------

/**
 * Atomically mark a plan entry cooked. Returns false if it was already cooked (or is gone), so two
 * simultaneous taps can't both use up the pantry.
 */
async function claimEntry(householdId: string, planId: string, entryId: string, cookedAt: Date) {
  const res = await MealPlan.updateOne(
    {
      _id: planId,
      householdId,
      entries: { $elemMatch: { _id: entryId, cookedAt: { $exists: false } } },
    },
    { $set: { "entries.$.cookedAt": cookedAt } }
  );
  return res.modifiedCount === 1;
}

async function releaseEntry(householdId: string, planId: string, entryId: string) {
  await MealPlan.updateOne(
    { _id: planId, householdId, "entries._id": entryId },
    { $unset: { "entries.$.cookedAt": "" } }
  );
}

// ---- cooking ------------------------------------------------------------------------------------

/**
 * Cook a recipe now: take its ingredients out of the pantry (soonest-expiring batch first) and
 * record it. No meal plan needed. If `planId` + `entryId` are given, that entry is marked cooked.
 *
 * Never refuses because the pantry is short; it takes what's there and reports the gap, since the
 * pantry count is only as accurate as people keep it. Staples (salt, oil...) are not tracked.
 */
export async function cookRecipe(householdId: string, recipeId: string, input: CookRecipeInput) {
  const recipe = await Recipe.findOne({ _id: recipeId, householdId })
    .select("name servings ingredients")
    .lean();
  if (!recipe) throw new NotFoundError("Recipe not found");

  // validate the plan link before touching anything
  let entryServings: number | undefined;
  const { planId, entryId } = input;
  if (planId && entryId) {
    const plan = await MealPlan.findOne({ _id: planId, householdId }).select("entries").lean();
    if (!plan) throw new NotFoundError("Meal plan not found");
    const entry = plan.entries.find((e) => String(e._id) === entryId);
    if (!entry) throw new NotFoundError("Plan entry not found");
    if (String(entry.recipeId) !== recipeId) {
      throw new AppError("That plan entry is for a different recipe", 422, "entry_recipe_mismatch");
    }
    if (entry.cookedAt) {
      throw new AppError("That meal is already marked as cooked", 409, "already_cooked");
    }
    entryServings = entry.servings;
  }

  const servings = input.servings ?? entryServings ?? recipe.servings;
  const cookedAt = new Date();

  // claim the entry first so a double tap can't cook twice; give it back if anything fails
  let claimed = false;
  if (planId && entryId) {
    claimed = await claimEntry(householdId, planId, entryId, cookedAt);
    if (!claimed) throw new AppError("That meal is already marked as cooked", 409, "already_cooked");
  }

  try {
    return await consume(householdId, recipeId, recipe, servings, cookedAt, input);
  } catch (error) {
    if (claimed && planId && entryId) {
      await releaseEntry(householdId, planId, entryId).catch(() => undefined);
    }
    throw error;
  }
}

async function consume(
  householdId: string,
  recipeId: string,
  recipe: { name: string; servings: number; ingredients: { ingredientId: unknown; baseQuantity: number; optional?: boolean | undefined }[] },
  servings: number,
  cookedAt: Date,
  input: CookRecipeInput
) {
  const recipeInput: RecipeInput = {
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((line) => ({
      ingredientId: String(line.ingredientId),
      baseQuantity: line.baseQuantity,
      optional: line.optional,
    })),
  };
  const ingredientIds = [...new Set(recipeInput.ingredients.map((l) => l.ingredientId))];
  const ingredients = await loadIngredientInfoMap(ingredientIds, householdId);

  // Reuse the shopping-list math for scaling, with an empty pantry: what it says to buy is exactly
  // what the recipe needs (staples and optional lines already left out).
  const scaled = buildShoppingList({
    entries: [{ recipeId, servings }],
    recipes: new Map([[recipeId, recipeInput]]),
    ingredients,
    pantry: [],
    options: { includeOptional: input.includeOptional ?? false },
  });
  const needs = scaled.toBuy.map((item) => ({ ingredientId: item.ingredientId, baseQuantity: item.needed }));

  const rows: PantryRow[] =
    needs.length > 0
      ? await PantryItem.find({ householdId, ingredientId: { $in: needs.map((n) => n.ingredientId) } })
          .select("ingredientId quantity unit baseQuantity expirationDate location createdAt")
          .lean()
      : [];
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  const batches: PantryBatch[] = rows.map((r) => ({
    id: String(r._id),
    ingredientId: String(r.ingredientId),
    baseQuantity: r.baseQuantity,
    expirationDate: r.expirationDate,
    createdAt: r.createdAt,
  }));

  const today = input.today ?? cookedAt.toISOString().slice(0, 10);
  const plan = planConsumption(needs, batches, { asOf: new Date(`${today}T00:00:00.000Z`) });

  // take from the pantry; each update only succeeds if the batch still holds enough
  const consumed: ConsumedRecord[] = [];
  const missed = new Map<string, number>();
  for (const t of plan.takes) {
    const row = byId.get(t.batchId);
    if (!row) continue;
    const res = await PantryItem.updateOne(
      { _id: t.batchId, householdId, baseQuantity: { $gte: t.take - EPS } },
      consumePipeline(t.take),
      { updatePipeline: true }
    );
    if (res.matchedCount !== 1) {
      missed.set(t.ingredientId, (missed.get(t.ingredientId) ?? 0) + t.take); // changed under us
      continue;
    }
    consumed.push({
      pantryItemId: new Types.ObjectId(t.batchId),
      ingredientId: new Types.ObjectId(t.ingredientId),
      baseQuantity: t.take,
      quantity: round6(t.take * (row.quantity / row.baseQuantity)),
      unit: row.unit as Unit,
      ...(row.expirationDate ? { expirationDate: row.expirationDate } : {}),
      ...(row.location ? { location: row.location } : {}),
    });
  }

  // a batch used up completely is removed rather than left behind as an empty row
  if (consumed.length > 0) {
    await PantryItem.deleteMany({
      _id: { $in: consumed.map((c) => c.pantryItemId) },
      householdId,
      baseQuantity: { $lte: EPS },
    });
  }

  const short = new Map<string, number>();
  for (const s of plan.shortfalls) short.set(s.ingredientId, (short.get(s.ingredientId) ?? 0) + s.missing);
  for (const [id, q] of missed) short.set(id, (short.get(id) ?? 0) + q);
  const shortfalls = [...short].map(([ingredientId, baseQuantity]) => ({
    ingredientId,
    name: ingredients.get(ingredientId)?.name ?? "Unknown ingredient",
    baseQuantity: round6(baseQuantity),
  }));

  try {
    const cookLog = await CookLog.create({
      householdId,
      recipeId,
      recipeName: recipe.name,
      servings,
      cookedAt,
      ...(input.planId && input.entryId ? { planId: input.planId, entryId: input.entryId } : {}),
      consumed,
      shortfalls,
    });
    return { cookLog, warnings: scaled.warnings };
  } catch (error) {
    await restoreConsumed(householdId, consumed).catch(() => undefined); // don't lose the stock
    throw error;
  }
}

// ---- undo ---------------------------------------------------------------------------------------

/** Put consumed amounts back, recreating any batch that was emptied and deleted. */
async function restoreConsumed(
  householdId: string,
  consumed: readonly ConsumedRecord[]
) {
  for (const c of consumed) {
    const res = await PantryItem.updateOne(
      { _id: c.pantryItemId, householdId },
      restorePipeline(c.baseQuantity, c.quantity),
      { updatePipeline: true }
    );
    if (res.matchedCount === 0) {
      await PantryItem.create({
        _id: c.pantryItemId,
        householdId,
        ingredientId: c.ingredientId,
        quantity: c.quantity,
        unit: c.unit,
        baseQuantity: c.baseQuantity,
        ...(c.expirationDate ? { expirationDate: c.expirationDate } : {}),
        ...(c.location ? { location: c.location } : {}),
      });
    }
  }
}

/**
 * Undo a cook: the pantry gets its amounts back and a linked plan entry becomes uncooked again.
 * A cook can be undone once. If the database fails halfway through, the cook stays marked undone
 * (rather than risk restoring some batches twice on a retry) and the error is returned.
 */
export async function undoCook(householdId: string, cookId: string) {
  const log = await CookLog.findOneAndUpdate(
    { _id: cookId, householdId, undoneAt: { $exists: false } },
    { $set: { undoneAt: new Date() } },
    { new: true }
  );
  if (!log) {
    if (await CookLog.exists({ _id: cookId, householdId })) {
      throw new AppError("That cook was already undone", 409, "already_undone");
    }
    throw new NotFoundError("Cook not found");
  }

  await restoreConsumed(householdId, log.consumed);
  if (log.planId && log.entryId) {
    await releaseEntry(householdId, String(log.planId), String(log.entryId));
  }
  return log;
}

// ---- history ------------------------------------------------------------------------------------

/** What the household cooked, newest first. Undone cooks stay listed, marked by `undoneAt`. */
export async function listCookLog(householdId: string, query: ListCookLogQuery) {
  const { page, limit } = query;
  const [items, total] = await Promise.all([
    CookLog.find({ householdId })
      .sort({ cookedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CookLog.countDocuments({ householdId }),
  ]);
  return { items, page, limit, total };
}
