import { Types } from "mongoose";
import { Ingredient } from "../models/ingredient.js";
import type { IngredientInfo } from "./buildShoppingList.js";

/**
 * Like loadIngredientMap, but returns what a shopping list needs to label and group an
 * ingredient (name, aisle, staple flag, base unit type) instead of conversion densities.
 * Same visibility rule: global ingredients plus the household's own custom ones.
 */
export async function loadIngredientInfoMap(
  ids: readonly string[],
  householdId: string
): Promise<Map<string, IngredientInfo>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  // `householdId: null` also matches documents where the field is missing (global ingredients).
  const docs = await Ingredient.find({
    _id: { $in: unique },
    householdId: { $in: [null, new Types.ObjectId(householdId)] },
  })
    .select("name category isStaple baseUnitType")
    .lean();

  const map = new Map<string, IngredientInfo>();
  for (const d of docs) {
    map.set(String(d._id), {
      name: d.name,
      category: d.category,
      isStaple: d.isStaple,
      baseUnitType: d.baseUnitType,
    });
  }
  return map;
}
