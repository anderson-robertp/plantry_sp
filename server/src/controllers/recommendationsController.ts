import type { NextFunction, Request, Response } from "express";
import { recommendRecipes } from "../services/recommendations.js";
import { AppError } from "../utils/errors.js";
import { recommendationsQuery } from "../validation/recommendations.js";

export async function recommendationsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.householdId) throw new AppError("Household ID is required", 400, "household_required");
    res.json(await recommendRecipes(req.householdId, recommendationsQuery.parse(req.query)));
  } catch (error) {
    next(error);
  }
}
