import type { NextFunction, Request, Response } from "express";
import { cookRecipe, listCookLog, undoCook } from "../services/cook.js";
import { AppError } from "../utils/errors.js";
import { cookParams, cookRecipeInput, cookRecipeParams, listCookLogQuery } from "../validation/cook.js";

function householdIdOf(req: Request): string {
  if (!req.householdId) {
    throw new AppError("Household ID is required", 400, "household_required");
  }
  return req.householdId;
}

/** POST /recipes/:recipeId/cook. The body is optional: no body means "cooked as written". */
export async function cookRecipeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { recipeId } = cookRecipeParams.parse(req.params);
    const input = cookRecipeInput.parse(req.body ?? {});
    res.status(201).json(await cookRecipe(householdId, recipeId, input));
  } catch (error) {
    next(error);
  }
}

export async function undoCookController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { cookId } = cookParams.parse(req.params);
    res.json(await undoCook(householdId, cookId));
  } catch (error) {
    next(error);
  }
}

export async function listCookLogController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    res.json(await listCookLog(householdId, listCookLogQuery.parse(req.query)));
  } catch (error) {
    next(error);
  }
}
