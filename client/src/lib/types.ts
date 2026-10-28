// Shapes of what the API returns. Where the API may send either an id or a populated object,
// the type says so and format.ts has helpers that handle both.

export type Unit = "g" | "kg" | "oz" | "lb" | "ml" | "l" | "tsp" | "tbsp" | "fl_oz" | "cup" | "pinch" | "piece";
export type Location = "pantry" | "fridge" | "freezer";
export type BaseUnitType = "mass" | "volume" | "count";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface Household {
  _id: string;
  name: string;
}

/** What GET /api/households returns: one row per household the user belongs to. */
export interface Membership {
  _id: string;
  role: string;
  householdId: Household | string;
}

export interface Ingredient {
  _id: string;
  name: string;
  category?: string;
  baseUnitType: BaseUnitType;
  defaultUnit?: Unit;
  householdId?: string | null;
}

export type Ref = string | { _id: string; name?: string };

export interface PantryItem {
  _id: string;
  ingredientId: Ref;
  quantity: number;
  unit: Unit;
  expirationDate?: string | null;
  location?: Location;
}

export interface RecipeLine {
  ingredientId: Ref;
  quantity: number;
  unit: Unit;
  optional?: boolean;
}

export interface Recipe {
  _id: string;
  name: string;
  description?: string;
  servings: number;
  steps?: string[];
  ingredients: RecipeLine[];
  tags?: string[];
}

export interface MissingIngredient {
  ingredientId: string;
  name: string;
  needed: number;
  have: number;
  missing: number;
  display: { unit: Unit; needed: number; have: number; toBuy: number };
}

export interface RecipeMatch {
  recipeId: string;
  name: string;
  servings: number;
  canCook: boolean;
  coverage: number;
  totalIngredients: number;
  haveCount: number;
  missing: MissingIngredient[];
}

export interface MatchResponse {
  total: number;
  cookableCount: number;
  matches: RecipeMatch[];
}

/** Lists come back either as a bare array or wrapped as { items }. */
export type Listed<T> = T[] | { items: T[] };

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealPlanEntry {
  _id: string;
  date: string;
  slot: MealSlot;
  recipeId: Ref;
  servings: number;
  cookedAt?: string;
}

export interface MealPlan {
  _id: string;
  name?: string;
  startDate: string;
  endDate: string;
  entries: MealPlanEntry[];
}

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  category: string;
  needed: number;
  have: number;
  toBuy: number;
  display: { unit: Unit; needed: number; have: number; toBuy: number };
  checked: boolean;
  note?: string;
}

export interface CustomShoppingItem {
  _id: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: Unit;
  note?: string;
  checked: boolean;
}

export interface ShoppingList {
  _id: string;
  planId: string;
  generatedAt: string;
  items: ShoppingItem[];
  covered: ShoppingItem[];
  staples: ShoppingItem[];
  extraItems?: CustomShoppingItem[];
  warnings: { code: string; message: string }[];
}

export interface CookLog {
  _id: string;
  recipeId: string;
  recipeName: string;
  servings: number;
  cookedAt: string;
  planId?: string;
  entryId?: string;
  shortfalls: { ingredientId: string; name: string }[];
  undoneAt?: string;
}

export interface CookResult {
  cookLog: CookLog;
  warnings: { message: string }[];
}

export interface ExpiryRow {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location?: string;
  expirationDate: string;
  daysLeft: number;
}

export interface UpcomingMeal {
  planId: string;
  planName?: string;
  entryId: string;
  date: string;
  slot: MealSlot;
  recipeId: string;
  recipeName: string;
  servings: number;
  cooked: boolean;
}

export interface Dashboard {
  today: string;
  pantry: {
    itemCount: number;
    expiringSoon: { withinDays: number; count: number; items: ExpiryRow[] };
    expired: { count: number; items: ExpiryRow[] };
  };
  upcomingMeals: { plannedCount: number; cookedCount: number; meals: UpcomingMeal[] };
  shoppingList: { planId: string; planName?: string; total: number; checked: number; remaining: number; percentDone: number } | null;
  recentCooks: { id: string; recipeName: string; servings: number; cookedAt: string }[];
  recipes: { count: number; cookableNow: number };
}
