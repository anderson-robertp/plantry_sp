// src/models/schemas/recipeFields.ts
import { Schema } from "mongoose";
import { recipeIngredientLineSchema } from "./recipeIngredientLine.js";

export const recipeFields = {
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  servings: { type: Number, required: true, min: 1 },
  steps: { type: [String], default: [] },
  ingredients: { type: [recipeIngredientLineSchema], default: [] },
  tags: { type: [String], default: [] },
  prepTimeMinutes: { type: Number, min: 0 },
  cookTimeMinutes: { type: Number, min: 0 },
  sourceUrl: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
};