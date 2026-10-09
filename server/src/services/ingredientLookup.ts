import { Types } from "mongoose";
import { Ingredient } from "../models/ingredient.js";
import type { ConvertibleIngredient } from "../utils/units.js";

/**
 * Load the ingredients a caller is allowed to use, keyed by id string.
 *
 *  - householdId given: global ingredients + that household's custom ones
 *  - householdId null:  global ingredients only (use this for global recipes,
 *    so they can never point at a household's private ingredient)
 *
 * Ids outside that scope are simply absent from the map, which the resolve
 * functions report as "unknown ingredient".
 *
 * Requires IIngredient to have baseUnitType, gramsPerMl, gramsPerPiece and
 * householdId (see the Ingredient schema changes).
 */
export async function loadIngredientMap(
  ids: readonly string[],
  householdId: string | null
): Promise<Map<string, ConvertibleIngredient>> {
  const unique = [...new Set(ids)];

  // `householdId: null` matches documents where the field is null OR missing,
  // which is how global ingredients are stored.
  const scope = householdId ? { $in: [null, new Types.ObjectId(householdId)] } : null;

  const docs = await Ingredient.find({ _id: { $in: unique }, householdId: scope })
    .select("baseUnitType gramsPerMl gramsPerPiece")
    .lean();

  const map = new Map<string, ConvertibleIngredient>();
  for (const d of docs) {
    map.set(String(d._id), {
      baseUnitType: d.baseUnitType,
      gramsPerMl: d.gramsPerMl,
      gramsPerPiece: d.gramsPerPiece,
    });
  }
  return map;
}
