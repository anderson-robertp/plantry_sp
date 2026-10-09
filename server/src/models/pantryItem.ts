import mongoose, { Document, Schema } from "mongoose";
import { LOCATIONS , type Location } from "../utils/constants.js";

export interface IPantryItem extends Document {
  householdId: mongoose.Types.ObjectId;
  ingredientId: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  baseQuantity: number;
  location?: Location;
  expirationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pantryItemSchema = new Schema<IPantryItem>(
  {
    householdId: {
      type: Schema.Types.ObjectId,
      ref: "Household",
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

    baseQuantity: { 
      type: Number, 
      required: true, 
      min: 0 
    },

    location: {
      type: String,
      enum: ["fridge", "freezer", "pantry", "other"],
    },

    expirationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

pantryItemSchema.index({
  householdId: 1,
  ingredientId: 1,
  expirationDate: 1,
});

export const PantryItem = mongoose.model<IPantryItem>(
  "PantryItem",
  pantryItemSchema
);