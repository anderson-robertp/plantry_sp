import { toBaseQuantity, UnitConversionError, type ConvertibleIngredient } from "../utils/units.js";
import { AppError } from "../utils/errors.js";

/**
 * Pure logic: no Mongoose, no Express, no zod. Services load the ingredients
 * (see ingredientLookup.ts) and pass them in as a Map, which keeps this part
 * trivial to unit test.
 */

/** Ingredients keyed by lowercase hex id string. */
export type IngredientMap = ReadonlyMap<string, ConvertibleIngredient>;

/** Structural type; the zod-inferred recipe line input satisfies it. */
export interface LineInput {
  ingredientId: string;
  quantity: number;
  unit: string;
  originalText?: string | undefined;
  notes?: string | undefined;
  group?: string | undefined;
  optional?: boolean | undefined;
}

export interface ResolvedLine {
  ingredientId: string;
  quantity: number;
  unit: string;
  baseQuantity: number;
  originalText?: string;
  notes?: string;
  group?: string;
  optional: boolean;
}

/**
 * Compute baseQuantity for one ingredient. Throws AppError (422) when the
 * ingredient isn't visible to the caller or the unit can't be converted.
 */
export function resolveBaseQuantity(
  ingredientId: string,
  quantity: number,
  unit: string,
  ingredients: IngredientMap
): number {
  const ingredient = ingredients.get(ingredientId);
  if (!ingredient) {
    // Same error whether it doesn't exist or belongs to another household,
    // so ids can't be probed.
    throw new AppError(`Unknown ingredient: ${ingredientId}`, 422, "unknown_ingredient", {
      ingredientId,
    });
  }
  try {
    return toBaseQuantity(quantity, unit, ingredient);
  } catch (err) {
    if (err instanceof UnitConversionError) {
      throw new AppError(err.message, 422, "unit_conversion", { ingredientId, unit });
    }
    throw err;
  }
}

/** Resolve every line of a recipe, adding baseQuantity. */
export function resolveIngredientLines(
  inputs: readonly LineInput[],
  ingredients: IngredientMap
): ResolvedLine[] {
  return inputs.map((input, index) => {
    let baseQuantity: number;
    try {
      baseQuantity = resolveBaseQuantity(
        input.ingredientId,
        input.quantity,
        input.unit,
        ingredients
      );
    } catch (err) {
      if (err instanceof AppError) {
        throw new AppError(`Ingredient line ${index + 1}: ${err.message}`, err.status, err.code, {
          ...err.details,
          line: index,
        });
      }
      throw err;
    }
    const line: ResolvedLine = {
      ingredientId: input.ingredientId,
      quantity: input.quantity,
      unit: input.unit,
      baseQuantity,
      optional: input.optional ?? false,
    };
    // Only set keys that have a value: Mongoose's types reject explicit undefined.
    if (input.originalText !== undefined) line.originalText = input.originalText;
    if (input.notes !== undefined) line.notes = input.notes;
    if (input.group !== undefined) line.group = input.group;
    return line;
  });
}
