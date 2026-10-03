import mongoose from "mongoose";
import { PantryItem } from "../models/pantryItemModel.js";

export async function getPantryItems(
  householdId: string
) {
  if (!mongoose.isValidObjectId(householdId)) {
    throw new Error("Invalid household ID");
  }

  return PantryItem.find({
    householdId: new mongoose.Types.ObjectId(householdId),
  })
    .populate("ingredientId")
    .sort({ createdAt: 1 });
}

export async function addPantryItem(
  householdId: string,
  ingredientId: string,
  quantity: number,
  unit: string,
  expirationDate?: Date
) {
  if (!mongoose.isValidObjectId(householdId)) {
    throw new Error("Invalid household ID");
  }

  if (!mongoose.isValidObjectId(ingredientId)) {
    throw new Error("Invalid ingredient ID");
  }

  const pantryItemData: {
        householdId: mongoose.Types.ObjectId;
        ingredientId: mongoose.Types.ObjectId;
        quantity: number;
        unit: string;
        expirationDate?: Date;
    } = {
        householdId: new mongoose.Types.ObjectId(householdId),
        ingredientId: new mongoose.Types.ObjectId(ingredientId),
        quantity,
        unit,
    };

    if (expirationDate !== undefined) {
        pantryItemData.expirationDate = expirationDate;
    }

    return PantryItem.create(pantryItemData);
}

export async function updatePantryItem(
  householdId: string,
  pantryItemId: string,
  quantity: number,
  unit: string,
  expirationDate?: Date
) {
  if (!mongoose.isValidObjectId(householdId)) {
    throw new Error("Invalid household ID");
  }

  if (!mongoose.isValidObjectId(pantryItemId)) {
    throw new Error("Invalid pantry item ID");
  }

  const updateData: {
    quantity: number;
    unit: string;
    expirationDate?: Date;
  } = {
    quantity,
    unit,
  };

  if (expirationDate !== undefined) {
    updateData.expirationDate = expirationDate;
  }

  return PantryItem.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(pantryItemId),
      householdId: new mongoose.Types.ObjectId(householdId),
    },
    {
      updateData,
    },
    {
      new: true,
      runValidators: true,
    }
  );
}

export async function deletePantryItem(
  householdId: string,
  pantryItemId: string
) {
  if (!mongoose.isValidObjectId(householdId)) {
    throw new Error("Invalid household ID");
  }

  if (!mongoose.isValidObjectId(pantryItemId)) {
    throw new Error("Invalid pantry item ID");
  }

  return PantryItem.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(pantryItemId),
    householdId: new mongoose.Types.ObjectId(householdId),
  });
}