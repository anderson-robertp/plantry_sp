import mongoose, { Document, Schema } from "mongoose";

export interface IRecipeIngredient extends Document {
  recipeId: mongoose.Types.ObjectId;
  ingredientId: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recipeIngredientSchema =
  new Schema<IRecipeIngredient>(
    {
      recipeId: {
        type: Schema.Types.ObjectId,
        ref: "Recipe",
        required: true,
      },

      ingredientId: {
        type: Schema.Types.ObjectId,
        ref: "Ingredient",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      notes: {
        type: String,
        trim: true,
      },
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