import mongoose, { Document, Schema, Types } from "mongoose";
import { CANONICAL_UNITS, type Unit } from "../utils/units.js";
import { LOCATIONS, type Location } from "../utils/constants.js";

/** One pantry batch (or part of one) that a cook used up. Enough to put it back on undo. */
export interface ICookConsumed {
  pantryItemId: Types.ObjectId;
  ingredientId: Types.ObjectId;
  /** Base units removed (g / ml / piece). */
  baseQuantity: number;
  /** The same amount in the batch's own unit. */
  quantity: number;
  unit: Unit;
  /** Copied from the batch, so undo can recreate it if it was emptied and deleted. */
  expirationDate?: Date;
  location?: Location;
}

export interface ICookShortfall {
  ingredientId: Types.ObjectId;
  name: string;
  /** Base units that were needed but weren't in the pantry. */
  baseQuantity: number;
}

/**
 * A record that someone cooked a recipe. Works with or without a meal plan, so people can cook
 * on a whim. It is both the history ("what did we eat") and the handle for undo.
 */
export interface ICookLog extends Document {
  householdId: Types.ObjectId;
  recipeId: Types.ObjectId;
  /** Copied at cook time so history still reads right if the recipe is renamed or deleted. */
  recipeName: string;
  servings: number;
  cookedAt: Date;
  planId?: Types.ObjectId;
  entryId?: Types.ObjectId;
  consumed: ICookConsumed[];
  shortfalls: ICookShortfall[];
  undoneAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const consumedSchema = new Schema<ICookConsumed>(
  {
    pantryItemId: { type: Schema.Types.ObjectId, required: true },
    ingredientId: { type: Schema.Types.ObjectId, required: true },
    baseQuantity: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: CANONICAL_UNITS, required: true },
    expirationDate: { type: Date },
    location: { type: String, enum: LOCATIONS },
  },
  { _id: false }
);

const shortfallSchema = new Schema<ICookShortfall>(
  {
    ingredientId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    baseQuantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const cookLogSchema = new Schema<ICookLog>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    recipeName: { type: String, required: true },
    servings: { type: Number, required: true, min: 0.01 },
    cookedAt: { type: Date, required: true },
    planId: { type: Schema.Types.ObjectId, ref: "MealPlan" },
    entryId: { type: Schema.Types.ObjectId },
    consumed: { type: [consumedSchema], default: [] },
    shortfalls: { type: [shortfallSchema], default: [] },
    undoneAt: { type: Date },
  },
  { timestamps: true }
);

// "what did we cook recently", newest first
cookLogSchema.index({ householdId: 1, cookedAt: -1 });

export const CookLog = mongoose.model<ICookLog>("CookLog", cookLogSchema);
