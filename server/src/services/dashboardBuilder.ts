import { MEAL_SLOTS } from "../utils/mealPlanConstants.js";
import { dayNumber } from "../utils/planRange.js";

// ---- inputs ----------------------------------------------------------------------------------

export interface PantryRowInput {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location?: string | undefined;
  /** A calendar day stored at UTC midnight. */
  expirationDate: Date;
}

export interface PlanInput {
  id: string;
  name?: string | undefined;
  startDate: string;
  endDate: string;
  entries: readonly {
    id: string;
    date: string;
    slot: string;
    recipeId: string;
    servings: number;
    cookedAt?: Date | null | undefined;
  }[];
}

export interface ListInput {
  items: readonly { checked?: boolean | undefined }[];
  extraItems: readonly { checked?: boolean | undefined }[];
}

export interface CookInput {
  id: string;
  recipeId: string;
  recipeName: string;
  servings: number;
  cookedAt: Date;
}

// ---- outputs ---------------------------------------------------------------------------------

export interface PantryExpiryItem extends Omit<PantryRowInput, "expirationDate"> {
  expirationDate: string;
  /** Whole days from today. 0 = expires today, negative = already expired. */
  daysLeft: number;
}

export interface UpcomingMeal {
  planId: string;
  planName?: string | undefined;
  entryId: string;
  date: string;
  slot: string;
  recipeId: string;
  recipeName: string;
  servings: number;
  cooked: boolean;
}

export interface ListProgress {
  planId: string;
  planName?: string | undefined;
  total: number;
  checked: number;
  remaining: number;
  /** 0 to 100, whole number. An empty list counts as 100. */
  percentDone: number;
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * 86_400_000).toISOString().slice(0, 10);
}

/** Pantry rows with how many days each has left, soonest first. */
export function toExpiryItems(rows: readonly PantryRowInput[], today: string): PantryExpiryItem[] {
  const t = dayNumber(today);
  return rows
    .map((r): PantryExpiryItem => {
      const exp = dayOf(r.expirationDate);
      return { ...r, expirationDate: exp, daysLeft: dayNumber(exp) - t };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name));
}

/**
 * The plan to show progress for: the one covering today (latest start if several), otherwise the
 * next one that hasn't started. Plans that already ended are ignored.
 */
export function pickFocusPlan<T extends { startDate: string; endDate: string }>(plans: readonly T[], today: string): T | null {
  const current = plans.filter((p) => p.startDate <= today && today <= p.endDate).sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (current[0]) return current[0];
  return plans.filter((p) => p.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

/** Meals from `today` for `days` days across the given plans, in the order they'll be eaten. */
export function upcomingMeals(
  plans: readonly PlanInput[],
  recipeNames: ReadonlyMap<string, string>,
  today: string,
  days: number
): UpcomingMeal[] {
  const last = addDays(today, days - 1);
  const slotRank = (s: string) => {
    const i = (MEAL_SLOTS as readonly string[]).indexOf(s);
    return i === -1 ? MEAL_SLOTS.length : i;
  };
  const meals: UpcomingMeal[] = [];
  for (const plan of plans) {
    for (const e of plan.entries) {
      if (e.date < today || e.date > last) continue;
      meals.push({
        planId: plan.id,
        planName: plan.name,
        entryId: e.id,
        date: e.date,
        slot: e.slot,
        recipeId: e.recipeId,
        recipeName: recipeNames.get(e.recipeId) ?? "Deleted recipe",
        servings: e.servings,
        cooked: !!e.cookedAt,
      });
    }
  }
  return meals.sort((a, b) => a.date.localeCompare(b.date) || slotRank(a.slot) - slotRank(b.slot) || a.recipeName.localeCompare(b.recipeName));
}

/** Checked off vs. still to buy, counting both generated and added items. */
export function listProgress(plan: { id: string; name?: string | undefined }, list: ListInput | null): ListProgress | null {
  if (!list) return null;
  const all = [...list.items, ...list.extraItems];
  const checked = all.filter((i) => i.checked === true).length;
  return {
    planId: plan.id,
    planName: plan.name,
    total: all.length,
    checked,
    remaining: all.length - checked,
    percentDone: all.length === 0 ? 100 : Math.round((checked / all.length) * 100),
  };
}

export function recentCooks(cooks: readonly CookInput[]) {
  return cooks.map((c) => ({
    id: c.id,
    recipeId: c.recipeId,
    recipeName: c.recipeName,
    servings: c.servings,
    cookedAt: c.cookedAt.toISOString(),
  }));
}
