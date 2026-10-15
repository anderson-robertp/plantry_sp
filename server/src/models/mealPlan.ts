import mongoose, { Document, Schema, Types } from "mongoose";
import { MEAL_SLOTS, type MealSlot } from "../utils/mealPlanConstants.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface IMealPlanEntry {
  /** Stable id of this entry, so it can be moved, edited or cooked without resending the plan. */
  _id: Types.ObjectId;
  /** A calendar day as "YYYY-MM-DD", not an instant, so it can't shift with time zones. */
  date: string;
  slot: MealSlot;
  recipeId: Types.ObjectId;
  /** How many servings to cook; scales the recipe's quantities. */
  servings: number;
  /** Set when this meal was cooked. Cooked meals no longer count toward the shopping list. */
  cookedAt?: Date;
}

export interface IMealPlan extends Document {
  householdId: Types.ObjectId;
  name?: string;
  startDate: string;
  endDate: string;
  entries: IMealPlanEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const mealPlanEntrySchema = new Schema<IMealPlanEntry>({
  date: { type: String, required: true, match: DATE_ONLY },
  slot: { type: String, enum: MEAL_SLOTS, required: true },
  recipeId: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
  servings: { type: Number, required: true, min: 0.01, max: 100 },
  cookedAt: { type: Date },
});

const mealPlanSchema = new Schema<IMealPlan>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    name: { type: String, trim: true, maxlength: 100 },
    startDate: { type: String, required: true, match: DATE_ONLY },
    endDate: { type: String, required: true, match: DATE_ONLY },
    entries: { type: [mealPlanEntrySchema], default: [] },
  },
  { timestamps: true }
);

// "plans for this household around this time", newest first
mealPlanSchema.index({ householdId: 1, startDate: -1 });

export const MealPlan = mongoose.model<IMealPlan>("MealPlan", mealPlanSchema);
