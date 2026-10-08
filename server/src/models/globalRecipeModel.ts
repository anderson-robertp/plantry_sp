import mongoose, { Document, Schema, Types } from "mongoose";
import { IRecipeIngredientLine } from "./schemas/recipeIngredientLine.js";
import { recipeFields } from "./schemas/recipeFields.js";

export interface IGlobalRecipe extends Document {
  name: string;
  description?: string;
  servings: number;
  steps: string[];
  ingredients: IRecipeIngredientLine[];
  tags: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  sourceUrl?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const globalRecipeSchema = new Schema<IGlobalRecipe>(recipeFields, { timestamps: true });

globalRecipeSchema.index({ name: "text", tags: "text" });
globalRecipeSchema.index({ tags: 1 });
globalRecipeSchema.index({ "ingredients.ingredientId": 1 });

export const GlobalRecipe = mongoose.model<IGlobalRecipe>("GlobalRecipe", globalRecipeSchema);