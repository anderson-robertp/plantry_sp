import mongoose, { Document, Schema } from "mongoose";

export interface IGlobalRecipe extends Document {
  name: string;
  description?: string;
  servings: number;
  instructions: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const globalRecipeSchema = new Schema<IGlobalRecipe>(
  {
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

globalRecipeSchema.index({
  name: 1,
});

export const GlobalRecipe = mongoose.model<IGlobalRecipe>(
  "GlobalRecipe",
  globalRecipeSchema
);