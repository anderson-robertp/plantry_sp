import mongoose, { Document, Schema } from "mongoose";
import { normalizeName } from "../utils/text.js";
import { INGREDIENT_CATEGORIES, IngredientCategory } from "../utils/constants.js";
import { CANONICAL_UNITS, Unit } from "../utils/units.js";

export interface IIngredient extends Document {
  name: string;
  normalizedName: string;
  aliases: string[];
  category?: IngredientCategory;
  defaultUnit?: string;
  baseUnitType: "mass" | "volume" | "count";
  gramsPerMl?: number;      // for volume <-> mass conversion
  gramsPerPiece?: number;   // for "1 onion", "2 cloves garlic"
  /** How it's sold, for the shopping list ("can", 15 oz). One size per ingredient. */
  package?: { label: string; size: number; unit: Unit } | null;
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

    package: {
      type: new Schema(
        {
          label: { type: String, required: true, trim: true, lowercase: true, maxlength: 30 },
          size: { type: Number, required: true, min: 0 },
          unit: { type: String, enum: CANONICAL_UNITS, required: true },
        },
        { _id: false }
      ),
      default: undefined,
    },

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