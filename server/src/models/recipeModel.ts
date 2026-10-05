import mongoose, { Document, Schema } from "mongoose";

export interface IRecipe extends Document {
  householdId: mongoose.Types.ObjectId;
  sourceRecipeId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  servings: number;
  instructions: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
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

    instructions: {
      type: String,
      required: true,
      trim: true,
    },

    prepTimeMinutes: {
      type: Number,
      min: 0,
    },

    cookTimeMinutes: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

recipeSchema.index({
  householdId: 1,
  name: 1,
});

export const Recipe = mongoose.model<IRecipe>(
  "Recipe",
  recipeSchema
);