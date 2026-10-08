// src/models/schemas/recipeIngredientLine.ts
import { Schema, Types } from "mongoose";

export interface IRecipeIngredientLine {
  ingredientId: Types.ObjectId;
  quantity: number;
  unit: string;
  baseQuantity: number;
  originalText?: string;
  notes?: string;
  group?: string;
  optional: boolean;
}

export const recipeIngredientLineSchema = new Schema<IRecipeIngredientLine>(
  {
    ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    baseQuantity: { type: Number, required: true, min: 0 },
    originalText: { type: String, trim: true },
    notes: { type: String, trim: true },
    group: { type: String, trim: true },
    optional: { type: Boolean, default: false },
  },
  { _id: false }
);