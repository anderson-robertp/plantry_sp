import type { NextFunction, Request, Response } from "express";
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  saveGlobalRecipeToHousehold,
  updateRecipe,
} from "../services/recipe.js";
import { AppError } from "../utils/errors.js";
import {
  createRecipeInput,
  globalRecipeParams,
  listRecipesQuery,
  recipeParams,
  updateRecipeInput,
} from "../validation/recipe.js";

/**
 * Same pattern as the pantry controller: validate with zod, call the service,
 * and send every failure to next(error) so middleware/errorHandler.ts picks the
 * status (ZodError -> 422, AppError/NotFoundError -> their own status, else 500).
 */

function householdIdOf(req: Request): string {
  if (!req.householdId) {
    throw new AppError("Household ID is required", 400, "household_required");
  }
  return req.householdId;
}

export async function listRecipesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const query = listRecipesQuery.parse(req.query);

    res.json(await listRecipes(householdId, query));
  } catch (error) {
    next(error);
  }
}

export async function getRecipeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { recipeId } = recipeParams.parse(req.params);

    res.json(await getRecipe(householdId, recipeId));
  } catch (error) {
    next(error);
  }
}

export async function createRecipeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const input = createRecipeInput.parse(req.body);

    res.status(201).json(await createRecipe(householdId, input));
  } catch (error) {
    next(error);
  }
}

export async function updateRecipeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { recipeId } = recipeParams.parse(req.params);
    const input = updateRecipeInput.parse(req.body);

    res.json(await updateRecipe(householdId, recipeId, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteRecipeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { recipeId } = recipeParams.parse(req.params);

    await deleteRecipe(householdId, recipeId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/** POST /global-recipes/:globalRecipeId/save: copy a catalog recipe into the household. */
export async function saveGlobalRecipeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { globalRecipeId } = globalRecipeParams.parse(req.params);

    res.status(201).json(await saveGlobalRecipeToHousehold(householdId, globalRecipeId));
  } catch (error) {
    next(error);
  }
}
