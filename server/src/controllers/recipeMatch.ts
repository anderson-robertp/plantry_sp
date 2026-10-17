import type { NextFunction, Request, Response } from "express";
import { matchHouseholdRecipes, recipeAvailability } from "../services/recipeAvailability.js";
import { AppError } from "../utils/errors.js";
import { recipeAvailabilityParams, recipeMatchQuery } from "../validation/recipeMatch.js";

function householdIdOf(req: Request): string {
  if (!req.householdId) throw new AppError("Household ID is required", 400, "household_required");
  return req.householdId;
}

export async function matchRecipesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await matchHouseholdRecipes(householdIdOf(req), recipeMatchQuery.parse(req.query)));
  } catch (error) {
    next(error);
  }
}

export async function recipeAvailabilityController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { recipeId } = recipeAvailabilityParams.parse(req.params);
    res.json(await recipeAvailability(householdIdOf(req), recipeId, recipeMatchQuery.parse(req.query)));
  } catch (error) {
    next(error);
  }
}
