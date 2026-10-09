import mongoose, { Document, Schema } from "mongoose";

export interface IRecipeIngredient extends Document {
  ingredientId: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  baseQuantity: number; // grams / ml / count
  originalText?: string; // "2 cloves garlic, minced"
  group?: string;        // "Crust", "Sauce"
  optional?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recipeIngredientSchema =
  new Schema<IRecipeIngredient>(
    {
      ingredientId: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
      quantity: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true },
      baseQuantity: { type: Number, required: true, min: 0 }, // grams / ml / count
      originalText: { type: String, trim: true },             // "2 cloves garlic, minced"
      notes: { type: String, trim: true },
      group: { type: String, trim: true },                    // "Crust", "Sauce"
      optional: { type: Boolean, default: false },
    },
    {
      timestamps: true,
    }
  );

recipeIngredientSchema.index(
  {
    recipeId: 1,
    ingredientId: 1,
  },
  {
    unique: true,
  }
);

export const RecipeIngredient =
  mongoose.model<IRecipeIngredient>(
    "RecipeIngredient",
    recipeIngredientSchema
  );