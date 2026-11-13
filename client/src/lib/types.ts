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

export interface PackageDef {
  label: string;
  size: number;
  unit: Unit;
}

export interface Ingredient {
  _id: string;
  name: string;
  category?: string;
  baseUnitType: BaseUnitType;
  defaultUnit?: Unit;
  gramsPerMl?: number | null;
  gramsPerPiece?: number | null;
  package?: PackageDef | null;
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
  toTaste?: boolean;
}

export interface Recipe {
  _id: string;
  name: string;
  description?: string;
  servings: number;
  steps?: string[];
  ingredients: RecipeLine[];
  tags?: string[];
  sourceUrl?: string;
}

/** What the server hands back when previewing a recipe from a web page. Nothing is saved yet. */
export interface ImportIngredient {
  _id: string;
  name: string;
  category?: string;
  baseUnitType: BaseUnitType;
  gramsPerMl?: number | null;
  gramsPerPiece?: number | null;
  package?: { label: string; size: number; unit: Unit } | null;
  /** true for the shared catalog, which households can't edit */
  shared?: boolean;
}

export interface ImportLine {
  originalText: string;
  quantity: number | null;
  unit: Unit | null;
  name: string;
  notes?: string;
  optional: boolean;
  /** "salt, to taste": the recipe gives no amount on purpose. */
  toTaste?: boolean;
  match: { ingredient: ImportIngredient; confidence: "exact" | "close"; unitFits: boolean } | null;
  suggestions: ImportIngredient[];
}

export interface ImportPreview {
  sourceUrl: string;
  name: string;
  description?: string;
  servings: number;
  servingsGuessed: boolean;
  steps: string[];
  tags: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  imageUrl?: string;
  lines: ImportLine[];
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
export type Course = "main" | "side" | "appetizer" | "dessert" | "drink";

export interface MealPlanEntry {
  _id: string;
  date: string;
  slot: MealSlot;
  /** Missing on older entries; those count as "main". */
  course?: Course;
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
  /** Present when the ingredient has a package size: whole packages to buy. */
  package?: PackageDef & { count: number; exact: number };
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

export interface AdminIngredient {
  _id: string;
  name: string;
  normalizedName: string;
  category?: string;
  baseUnitType: BaseUnitType;
  defaultUnit?: Unit;
  gramsPerMl?: number;
  gramsPerPiece?: number;
  aliases?: string[];
  isStaple?: boolean;
  package?: PackageDef | null;
  /** Only on the single-ingredient endpoint. */
  usedBy?: { recipes: number; pantry: number };
}

export interface AdminList {
  items: AdminIngredient[];
  page: number;
  limit: number;
  total: number;
}

export interface Member {
  userId: string;
  name: string;
  role: "owner" | "member";
  joinedAt?: string;
  you: boolean;
  /** Only the owner sees emails. */
  email?: string;
}

export interface PendingInvite {
  id: string;
  createdAt: string;
  expiresAt: string;
}

/** Returned once, when an invite is made. The server keeps only hashes, so it can't be shown again. */
export interface CreatedInvite {
  invite: PendingInvite;
  token: string;
  code: string;
}

export interface InvitePreview {
  householdName: string;
  memberCount: number;
  alreadyMember: boolean;
  full: boolean;
  expiresAt: string;
}

/** One suggested recipe, with the reasons it was picked. */
export interface Recommendation {
  recipeId: string;
  name: string;
  score: number;
  reasons: { code: string; text: string; tone: "good" | "bad" }[];
}
