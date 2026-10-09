import type { NextFunction, Request, Response } from "express";
import {
  createPantryItem,
  deletePantryItem,
  getPantryItems,
  updatePantryItem,
} from "../services/pantry.js";
import { AppError } from "../utils/errors.js";
import {
  createPantryItemInput,
  listPantryQuery,
  pantryItemParams,
  updatePantryItemInput,
} from "../validation/pantry.js";

/**
 * Validation happens here with zod, and every failure goes to next(error), where
 * middleware/errorHandler.ts turns it into the right status code:
 *   ZodError -> 422, AppError/NotFoundError -> their own status, anything else -> 500.
 */

function householdIdOf(req: Request): string {
  if (!req.householdId) {
    throw new AppError("Household ID is required", 400, "household_required");
  }
  return req.householdId;
}

export async function getPantryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { location } = listPantryQuery.parse(req.query);

    res.json(await getPantryItems(householdId, { location }));
  } catch (error) {
    next(error);
  }
}

export async function addPantryItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const input = createPantryItemInput.parse(req.body);

    res.status(201).json(await createPantryItem(householdId, input));
  } catch (error) {
    next(error);
  }
}

export async function updatePantryItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { pantryItemId } = pantryItemParams.parse(req.params);
    const input = updatePantryItemInput.parse(req.body);

    res.json(await updatePantryItem(householdId, pantryItemId, input));
  } catch (error) {
    next(error);
  }
}

export async function deletePantryItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { pantryItemId } = pantryItemParams.parse(req.params);

    await deletePantryItem(householdId, pantryItemId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}