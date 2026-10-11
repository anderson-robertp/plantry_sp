import type { NextFunction, Request, Response } from "express";
import {
  createMealPlan,
  deleteMealPlan,
  getMealPlan,
  listMealPlans,
  updateMealPlan,
} from "../services/mealPlan.js";
import {
  generateShoppingList,
  getShoppingList,
  setShoppingItemChecked,
} from "../services/shoppingList.js";
import { AppError } from "../utils/errors.js";
import {
  checkShoppingItemInput,
  createMealPlanInput,
  generateShoppingListInput,
  listMealPlansQuery,
  mealPlanParams,
  shoppingItemParams,
  updateMealPlanInput,
} from "../validation/mealPlan.js";

/** Same pattern as the recipe and pantry controllers: zod parse, service call, next(error). */

function householdIdOf(req: Request): string {
  if (!req.householdId) {
    throw new AppError("Household ID is required", 400, "household_required");
  }
  return req.householdId;
}

export async function listMealPlansController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const query = listMealPlansQuery.parse(req.query);
    res.json(await listMealPlans(householdId, query));
  } catch (error) {
    next(error);
  }
}

export async function getMealPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId } = mealPlanParams.parse(req.params);
    res.json(await getMealPlan(householdId, planId));
  } catch (error) {
    next(error);
  }
}

export async function createMealPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const input = createMealPlanInput.parse(req.body);
    res.status(201).json(await createMealPlan(householdId, input));
  } catch (error) {
    next(error);
  }
}

export async function updateMealPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId } = mealPlanParams.parse(req.params);
    const input = updateMealPlanInput.parse(req.body);
    res.json(await updateMealPlan(householdId, planId, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteMealPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId } = mealPlanParams.parse(req.params);
    await deleteMealPlan(householdId, planId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/** POST: (re)generates and saves the list. Body may be empty. */
export async function generateShoppingListController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId } = mealPlanParams.parse(req.params);
    const input = generateShoppingListInput.parse(req.body ?? {});
    res.json(await generateShoppingList(householdId, planId, input));
  } catch (error) {
    next(error);
  }
}

export async function getShoppingListController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId } = mealPlanParams.parse(req.params);
    res.json(await getShoppingList(householdId, planId));
  } catch (error) {
    next(error);
  }
}

export async function checkShoppingItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId, ingredientId } = shoppingItemParams.parse(req.params);
    const { checked } = checkShoppingItemInput.parse(req.body);
    res.json(await setShoppingItemChecked(householdId, planId, ingredientId, checked));
  } catch (error) {
    next(error);
  }
}
