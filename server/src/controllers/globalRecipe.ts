import type { NextFunction, Request, Response } from "express";
import { getGlobalRecipe, listGlobalRecipes } from "../services/globalRecipe.js";
import { globalRecipeParams, listRecipesQuery } from "../validation/recipe.js";

/**
 * Read-only catalog endpoints. They are not household-scoped (every household sees
 * the same catalog), so routes only need `authenticate`. Failures go to next(error)
 * like the other controllers: ZodError -> 422, NotFoundError -> 404, else 500.
 */

export async function listGlobalRecipesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listRecipesQuery.parse(req.query);

    res.json(await listGlobalRecipes(query));
  } catch (error) {
    next(error);
  }
}

export async function getGlobalRecipeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { globalRecipeId } = globalRecipeParams.parse(req.params);

    res.json(await getGlobalRecipe(globalRecipeId));
  } catch (error) {
    next(error);
  }
}
