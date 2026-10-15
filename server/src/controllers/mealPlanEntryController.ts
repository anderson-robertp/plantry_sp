import type { NextFunction, Request, Response } from "express";
import { addPlanEntry, removePlanEntry, updatePlanEntry } from "../services/mealPlanEntry.js";
import { AppError } from "../utils/errors.js";
import {
  mealPlanEntryInput,
  mealPlanEntryParams,
  mealPlanParams,
  updateMealPlanEntryInput,
} from "../validation/mealPlan.js";

function householdIdOf(req: Request): string {
  if (!req.householdId) {
    throw new AppError("Household ID is required", 400, "household_required");
  }
  return req.householdId;
}

export async function addPlanEntryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId } = mealPlanParams.parse(req.params);
    const input = mealPlanEntryInput.parse(req.body);
    res.status(201).json(await addPlanEntry(householdId, planId, input));
  } catch (error) {
    next(error);
  }
}

export async function updatePlanEntryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId, entryId } = mealPlanEntryParams.parse(req.params);
    const patch = updateMealPlanEntryInput.parse(req.body);
    res.json(await updatePlanEntry(householdId, planId, entryId, patch));
  } catch (error) {
    next(error);
  }
}

export async function removePlanEntryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId, entryId } = mealPlanEntryParams.parse(req.params);
    await removePlanEntry(householdId, planId, entryId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
