import mongoose, { Document, Schema } from "mongoose";

export interface IIngredient extends Document {
  name: string;
  category?: string;
  defaultUnit?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    defaultUnit: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

ingredientSchema.index(
  { name: 1 },
  { unique: true }
);

export const Ingredient = mongoose.model<IIngredient>(
  "Ingredient",
  ingredientSchema
);