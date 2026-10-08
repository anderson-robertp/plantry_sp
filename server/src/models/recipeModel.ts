import mongoose, { Document, Schema } from "mongoose";
//import { IRecipeIngredient } from "./recipeIngredientModel.js";
import { recipeIngredientLineSchema, IRecipeIngredientLine } from "./schemas/recipeIngredientLine.js";

export interface IRecipe extends Document {
  householdId: mongoose.Types.ObjectId;
  sourceRecipeId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  servings: number;
  ingredients: IRecipeIngredientLine[];
  tags: string[];
  steps: [String]
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  sourceUrl?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recipeSchema = new Schema<IRecipe>(
  {
    householdId: {
      type: Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },

    sourceRecipeId: {
      type: Schema.Types.ObjectId,
      ref: "GlobalRecipe",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    servings: {
      type: Number,
      required: true,
      min: 1,
    },

    ingredients: { type: [recipeIngredientLineSchema], default: [] },

    tags: { type: [String], default: [] },

    steps: {
      type: [String],
      required: true,
    },

    prepTimeMinutes: {
      type: Number,
      min: 0,
    },

    cookTimeMinutes: {
      type: Number,
      min: 0,
    },

    sourceUrl: {
      type: String,
      trim: true,
    },

    imageUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

recipeSchema.index({ householdId: 1, "ingredients.ingredientId": 1 });
recipeSchema.index({ householdId: 1, tags: 1 });

export const Recipe = mongoose.model<IRecipe>(
  "Recipe",
  recipeSchema
);