import type { NextFunction, Request, Response } from "express";
import { getDashboard } from "../services/dashboard.js";
import { AppError } from "../utils/errors.js";
import { dashboardQuery } from "../validation/dashboard.js";

export async function getDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.householdId) throw new AppError("Household ID is required", 400, "household_required");
    res.json(await getDashboard(req.householdId, dashboardQuery.parse(req.query)));
  } catch (error) {
    next(error);
  }
}
