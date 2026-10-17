import { Schema, Types } from "mongoose";
import { INGREDIENT_CATEGORIES, type IngredientCategory } from "../utils/constants.js";
import { CANONICAL_UNITS, type Unit } from "../utils/units.js";

/**
 * Something on the list that didn't come from a recipe ("paper towels", "birthday candles").
 * Stored apart from the generated `items`, so regenerating the list from the plan never touches it.
 */
export interface ICustomShoppingItem {
  _id: Types.ObjectId;
  name: string;
  category: IngredientCategory;
  quantity?: number;
  unit?: Unit;
  note?: string;
  checked: boolean;
  addedAt: Date;
}

export const customItemSchema = new Schema<ICustomShoppingItem>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: INGREDIENT_CATEGORIES, default: "other" },
  quantity: { type: Number, min: 0 },
  unit: { type: String, enum: CANONICAL_UNITS },
  note: { type: String, maxlength: 200 },
  checked: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
});
