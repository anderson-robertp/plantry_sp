import mongoose, { Document, Schema, Types } from "mongoose";
import { UNIT_SYSTEMS, type UnitSystem } from "../utils/mealPlanConstants.js";
import { CANONICAL_UNITS, type Unit } from "../utils/units.js";

export interface IShoppingSource {
  recipeId: Types.ObjectId;
  baseQuantity: number;
}

export interface IShoppingItem {
  ingredientId: Types.ObjectId;
  name: string;
  category: string;
  baseUnit: "g" | "ml" | "piece";
  /** Exact amounts in base units. */
  needed: number;
  have: number;
  toBuy: number;
  /** The same amounts in one friendly unit, for display. */
  display: { unit: Unit; needed: number; have: number; toBuy: number };
  isStaple: boolean;
  sources: IShoppingSource[];
  /** Shopper's check mark. Only meaningful on `items`. */
  checked: boolean;
}

export interface IShoppingWarning {
  code: "missing_recipe" | "missing_ingredient" | "invalid_servings";
  message: string;
  recipeId?: Types.ObjectId;
  ingredientId?: Types.ObjectId;
}

export interface IShoppingListOptions {
  includeStaples: boolean;
  includeOptional: boolean;
  unitSystem: UnitSystem;
  ignoreExpired: boolean;
}

/**
 * A saved snapshot of buildShoppingList's result for one plan, so check marks persist.
 * It is always generated from the plan, never edited by hand; regenerating replaces the
 * contents and carries the check marks over (see carryOverChecked).
 */
export interface IShoppingList extends Document {
  householdId: Types.ObjectId;
  planId: Types.ObjectId;
  generatedAt: Date;
  options: IShoppingListOptions;
  /** Still to buy. */
  items: IShoppingItem[];
  /** Needed, but already in the pantry. */
  covered: IShoppingItem[];
  /** Staples left off the list. */
  staples: IShoppingItem[];
  warnings: IShoppingWarning[];
  createdAt: Date;
  updatedAt: Date;
}

const sourceSchema = new Schema<IShoppingSource>(
  {
    recipeId: { type: Schema.Types.ObjectId, required: true },
    baseQuantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const itemSchema = new Schema<IShoppingItem>(
  {
    ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    baseUnit: { type: String, enum: ["g", "ml", "piece"], required: true },
    needed: { type: Number, required: true, min: 0 },
    have: { type: Number, required: true, min: 0 },
    toBuy: { type: Number, required: true, min: 0 },
    display: {
      unit: { type: String, enum: CANONICAL_UNITS, required: true },
      needed: { type: Number, required: true, min: 0 },
      have: { type: Number, required: true, min: 0 },
      toBuy: { type: Number, required: true, min: 0 },
    },
    isStaple: { type: Boolean, default: false },
    sources: { type: [sourceSchema], default: [] },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
);

const warningSchema = new Schema<IShoppingWarning>(
  {
    code: {
      type: String,
      enum: ["missing_recipe", "missing_ingredient", "invalid_servings"],
      required: true,
    },
    message: { type: String, required: true },
    recipeId: { type: Schema.Types.ObjectId },
    ingredientId: { type: Schema.Types.ObjectId },
  },
  { _id: false }
);

const shoppingListSchema = new Schema<IShoppingList>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "MealPlan", required: true },
    generatedAt: { type: Date, required: true },
    options: {
      includeStaples: { type: Boolean, default: false },
      includeOptional: { type: Boolean, default: false },
      unitSystem: { type: String, enum: UNIT_SYSTEMS, default: "metric" },
      ignoreExpired: { type: Boolean, default: true },
    },
    items: { type: [itemSchema], default: [] },
    covered: { type: [itemSchema], default: [] },
    staples: { type: [itemSchema], default: [] },
    warnings: { type: [warningSchema], default: [] },
  },
  { timestamps: true }
);

// One list per plan. This also makes concurrent "generate" calls collide instead of duplicating.
shoppingListSchema.index({ householdId: 1, planId: 1 }, { unique: true });

export const ShoppingList = mongoose.model<IShoppingList>("ShoppingList", shoppingListSchema);
