import type { UnitSystem } from "../utils/mealPlanConstants.js";
import { UNITS, type Unit, type UnitType } from "../utils/units.js";
import mongoose from "mongoose";

/**
 * The heart of the app. Pure: no Mongoose, no Express, no clock. Give it a plan,
 * the recipes it uses, ingredient info and the pantry; get back what to buy.
 *
 *   needed = sum over plan entries of (recipe line baseQuantity x entry servings / recipe servings)
 *   have   = sum of the household's pantry batches for that ingredient (minus batches already expired at `asOf`)
 *   toBuy  = max(0, needed - have)
 *
 * All math uses baseQuantity (g / ml / piece), which is why units were normalized at write time.
 * Display values (a friendly unit, rounded) are derived last and never fed back into the math.
 *
 * Known simplifications: package sizes are not modeled (you need 1 cup, you buy a bag), and a
 * batch that expires mid-plan still counts as fully available.
 */

// ---- input types -----------------------------------------------------------------------------

export interface PlanEntryInput {
  recipeId: string;
  servings: number;
}

export interface RecipeLineInput {
  ingredientId: string;
  baseQuantity: number;
  optional?: boolean | undefined;
}

export interface RecipeInput {
  /** What the recipe's quantities are written for. */
  servings: number;
  ingredients: readonly RecipeLineInput[];
}

export interface IngredientInfo {
  name: string;
  category?: string | undefined;
  isStaple?: boolean | undefined;
  baseUnitType: UnitType;
}

export interface PantryBatchInput {
  ingredientId: string;
  baseQuantity: number;
  expirationDate?: Date | null | undefined;
}

export interface ShoppingListOptions {
  /** Treat staples (salt, oil, water...) like any other ingredient. Default false. */
  includeStaples?: boolean | undefined;
  /** Count recipe lines marked optional. Default false. */
  includeOptional?: boolean | undefined;
  /** Display units. Default "metric". */
  unitSystem?: UnitSystem | undefined;
  /** Pantry batches that expire before this instant are ignored. Omit to count everything. */
  asOf?: Date | undefined;
}

export interface BuildShoppingListInput {
  entries: readonly PlanEntryInput[];
  /** Keyed by recipe id. */
  recipes: ReadonlyMap<string, RecipeInput>;
  /** Keyed by ingredient id. */
  ingredients: ReadonlyMap<string, IngredientInfo>;
  pantry: readonly PantryBatchInput[];
  options?: ShoppingListOptions | undefined;
}

// ---- output types ----------------------------------------------------------------------------

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  category: string;
  baseUnit: "g" | "ml" | "piece";
  /** Exact amounts in base units. These are the source of truth. */
  needed: number;
  have: number;
  toBuy: number;
  /** The same three amounts in one friendly unit (needed/toBuy round up, have rounds down). */
  display: { unit: Unit; needed: number; have: number; toBuy: number };
  isStaple: boolean;
  /** Which recipes need it, biggest first. */
  sources: { recipeId: string; baseQuantity: number }[];
}

export type ShoppingWarningCode = "missing_recipe" | "missing_ingredient" | "invalid_servings";

export interface ShoppingWarning {
  code: ShoppingWarningCode;
  message: string;
  recipeId?: string | undefined;
  ingredientId?: string | undefined;
}

export interface ShoppingListResult {
  /** Still to buy (toBuy > 0), in aisle order then A-Z. */
  toBuy: ShoppingItem[];
  /** Needed, but the pantry already covers it. */
  covered: ShoppingItem[];
  /** Staples that were left off the list (only when includeStaples is false). */
  staples: ShoppingItem[];
  warnings: ShoppingWarning[];
}

// ---- helpers ---------------------------------------------------------------------------------

/** Walk the store aisles in this order. Unknown categories go after these, A-Z. */
export const AISLE_ORDER = [
  "produce",
  "meat",
  "dairy",
  "bakery",
  "frozen",
  "pantry",
  "spices",
  "other",
] as const;

/** Per base type: [display unit, exclusive upper bound in base units]. First match wins. */
const LADDERS: Record<UnitSystem, Record<UnitType, ReadonlyArray<readonly [Unit, number]>>> = {
  metric: {
    mass: [["g", 1000], ["kg", Infinity]],
    volume: [["ml", 1000], ["l", Infinity]],
    count: [["piece", Infinity]],
  },
  us: {
    mass: [["oz", UNITS.lb.factor], ["lb", Infinity]],
    volume: [["tsp", UNITS.tbsp.factor], ["tbsp", UNITS.cup.factor / 4], ["cup", Infinity]],
    count: [["piece", Infinity]],
  },
};

const EPS = 1e-9;

/** Kill floating-point noise from summing many small numbers. */
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

// "+ 0" turns -0 into 0, so a zero never shows up as -0.
const ceilTo = (n: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.ceil(n * f - EPS) / f + 0;
};
const floorTo = (n: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.floor(n * f + EPS) / f + 0;
};

function baseUnitOf(type: UnitType): "g" | "ml" | "piece" {
  return type === "mass" ? "g" : type === "volume" ? "ml" : "piece";
}

function pickUnit(type: UnitType, amount: number, system: UnitSystem): Unit {
  const ladder = LADDERS[system][type];
  for (const [unit, bound] of ladder) {
    if (amount < bound) return unit;
  }
  return ladder[ladder.length - 1]?.[0] ?? "piece"; // unreachable: every ladder ends at Infinity
}

function toDisplay(
  needed: number,
  have: number,
  toBuy: number,
  type: UnitType,
  system: UnitSystem
): ShoppingItem["display"] {
  // One unit per item, chosen by what is needed, so the three numbers line up.
  const unit = pickUnit(type, needed, system);
  const factor = UNITS[unit].factor;
  const n = needed / factor;
  const decimals = unit === "piece" ? 0 : n >= 100 ? 0 : n >= 10 ? 1 : 2;
  return {
    unit,
    needed: ceilTo(n, decimals),
    have: floorTo(have / factor, decimals),
    toBuy: ceilTo(toBuy / factor, decimals),
  };
}

function aisleRank(category: string): number {
  const i = (AISLE_ORDER as readonly string[]).indexOf(category);
  return i === -1 ? AISLE_ORDER.length : i;
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

function compareItems(a: ShoppingItem, b: ShoppingItem): number {
  return (
    aisleRank(a.category) - aisleRank(b.category) ||
    collator.compare(a.category, b.category) ||
    collator.compare(a.name, b.name) ||
    a.ingredientId.localeCompare(b.ingredientId)
  );
}

// ---- main ------------------------------------------------------------------------------------

export function buildShoppingList(input: BuildShoppingListInput): ShoppingListResult {
  const { entries, recipes, ingredients, pantry } = input;
  const includeStaples = input.options?.includeStaples ?? false;
  const includeOptional = input.options?.includeOptional ?? false;
  const unitSystem: UnitSystem = input.options?.unitSystem ?? "metric";
  const asOf = input.options?.asOf;

  const warnings: ShoppingWarning[] = [];
  const warnedRecipes = new Set<string>();
  const warnedIngredients = new Set<string>();

  // 1) what the plan needs, per ingredient
  const needs = new Map<
    string,
    { info: IngredientInfo; total: number; sources: Map<string, number> }
  >();

  for (const entry of entries) {
    const recipe = recipes.get(entry.recipeId);
    if (!recipe) {
      if (!warnedRecipes.has(entry.recipeId)) {
        warnedRecipes.add(entry.recipeId);
        warnings.push({
          code: "missing_recipe",
          message: `A planned recipe no longer exists (${entry.recipeId}); it was left out.`,
          recipeId: entry.recipeId,
        });
      }
      continue;
    }

    const servingsOk =
      Number.isFinite(entry.servings) &&
      entry.servings > 0 &&
      Number.isFinite(recipe.servings) &&
      recipe.servings > 0;
    if (!servingsOk) {
      warnings.push({
        code: "invalid_servings",
        message: `Skipped a planned recipe (${entry.recipeId}) because its servings are not a positive number.`,
        recipeId: entry.recipeId,
      });
      continue;
    }

    const factor = entry.servings / recipe.servings;
    for (const line of recipe.ingredients) {
      if (line.optional && !includeOptional) continue;
      const amount = line.baseQuantity * factor;
      // A zero quantity ("salt, to taste") adds nothing to buy.
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const info = ingredients.get(line.ingredientId);
      if (!info) {
        if (!warnedIngredients.has(line.ingredientId)) {
          warnedIngredients.add(line.ingredientId);
          warnings.push({
            code: "missing_ingredient",
            message: `An ingredient used by a planned recipe no longer exists (${line.ingredientId}); it was left out.`,
            ingredientId: line.ingredientId,
          });
        }
        continue;
      }

      let need = needs.get(line.ingredientId);
      if (!need) {
        need = { info, total: 0, sources: new Map() };
        needs.set(line.ingredientId, need);
      }
      need.total += amount;
      need.sources.set(entry.recipeId, (need.sources.get(entry.recipeId) ?? 0) + amount);
    }
  }

  // 2) what the pantry has
  const have = new Map<string, number>();
  for (const batch of pantry) {
    if (!needs.has(batch.ingredientId)) continue;
    if (!Number.isFinite(batch.baseQuantity) || batch.baseQuantity <= 0) continue;
    if (asOf && batch.expirationDate && batch.expirationDate.getTime() < asOf.getTime()) continue;
    have.set(batch.ingredientId, (have.get(batch.ingredientId) ?? 0) + batch.baseQuantity);
  }

  // 3) subtract and classify
  const toBuy: ShoppingItem[] = [];
  const covered: ShoppingItem[] = [];
  const staples: ShoppingItem[] = [];

  for (const [ingredientId, need] of needs) {
    const needed = round4(need.total);
    const haveQty = round4(have.get(ingredientId) ?? 0);
    const buy = round4(Math.max(0, needed - haveQty));

    const item: ShoppingItem = {
      ingredientId,
      name: need.info.name,
      category: need.info.category ?? "other",
      baseUnit: baseUnitOf(need.info.baseUnitType),
      needed,
      have: haveQty,
      toBuy: buy,
      display: toDisplay(needed, haveQty, buy, need.info.baseUnitType, unitSystem),
      isStaple: need.info.isStaple === true,
      sources: [...need.sources]
        .map(([recipeId, quantity]) => ({ recipeId, baseQuantity: round4(quantity) }))
        .sort((a, b) => b.baseQuantity - a.baseQuantity || a.recipeId.localeCompare(b.recipeId)),
    };

    if (item.isStaple && !includeStaples) staples.push(item);
    else if (item.toBuy > 0) toBuy.push(item);
    else covered.push(item);
  }

  toBuy.sort(compareItems);
  covered.sort(compareItems);
  staples.sort(compareItems);

  return { toBuy, covered, staples, warnings };
}

// ---- small companions --------------------------------------------------------------------------

/** Group items into aisles, in walking order, skipping empty aisles. */
export function groupByAisle<T extends { category: string; name: string }>(
  items: readonly T[]
): { category: string; items: T[] }[] {
  const sorted = [...items].sort(
    (a, b) =>
      aisleRank(a.category) - aisleRank(b.category) ||
      collator.compare(a.category, b.category) ||
      collator.compare(a.name, b.name)
  );
  const groups: { category: string; items: T[] }[] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.category === item.category) last.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }
  return groups;
}

/**
 * When a list is regenerated, keep the check marks the shopper already made:
 * an item stays checked if it was checked before; anything new starts unchecked.
 */
export function carryOverChecked<T extends { ingredientId: string | mongoose.Types.ObjectId }>(
  next: readonly T[],
  previous: readonly { ingredientId: string | mongoose.Types.ObjectId; checked?: boolean | undefined }[]
): (T & { checked: boolean })[] {
  const checked = new Set(previous.filter((p) => p.checked === true).map((p) => p.ingredientId));
  return next.map((item) => ({ ...item, checked: checked.has(item.ingredientId) }));
}
