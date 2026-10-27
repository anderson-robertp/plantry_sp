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
