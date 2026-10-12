import mongoose, { Document, Schema } from "mongoose";
import { normalizeName } from "../utils/text.js";
import { INGREDIENT_CATEGORIES, IngredientCategory } from "../utils/constants.js";

export interface IIngredient extends Document {
  name: string;
  normalizedName: string;
  aliases: string[];
  category?: IngredientCategory;
  defaultUnit?: string;
  baseUnitType: "mass" | "volume" | "count";
  gramsPerMl?: number;      // for volume <-> mass conversion
  gramsPerPiece?: number;   // for "1 onion", "2 cloves garlic"
  isStaple?: boolean; // optional field to indicate if the ingredient is a staple item
  householdId?: mongoose.Types.ObjectId;
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

    normalizedName: { 
      type: String, 
      required: true, 
      lowercase: true, 
      trim: true 
    },

    aliases: { type: [String], default: [] },

    category: {
      type: String,
      enum: INGREDIENT_CATEGORIES,
      trim: true,
    },

    defaultUnit: {
      type: String,
      trim: true,
    },

    baseUnitType: { 
      type: String, 
      enum: ["mass", "volume", "count"], 
      required: true 
    },

    gramsPerMl: { 
      type: Number, 
      min: 0 
    },      // for volume <-> mass conversion

    gramsPerPiece: { 
      type: Number, 
      min: 0 
    },   // for "1 onion", "2 cloves garlic"

    isStaple: { 
      type: Boolean, 
      default: false 
    }, // optional field to indicate if the ingredient is a staple item

     householdId: { type: Schema.Types.ObjectId, ref: "Household" },
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