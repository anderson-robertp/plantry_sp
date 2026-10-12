import type { NextFunction, Request, Response } from "express";
import {
  createIngredient,
  deleteIngredient,
  getIngredient,
  listIngredients,
  updateIngredient,
} from "../services/ingredient.js";
import { AppError } from "../utils/errors.js";
import {
  createIngredientInput,
  ingredientParams,
  listIngredientsQuery,
  updateIngredientInput,
} from "../validation/ingredient.js";

function householdIdOf(req: Request): string {
  if (!req.householdId) {
    throw new AppError("Household ID is required", 400, "household_required");
  }
  return req.householdId;
}

export async function listIngredientsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await listIngredients(householdIdOf(req), listIngredientsQuery.parse(req.query)));
  } catch (error) {
    next(error);
  }
}

export async function getIngredientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ingredientId } = ingredientParams.parse(req.params);
    res.json(await getIngredient(householdIdOf(req), ingredientId));
  } catch (error) {
    next(error);
  }
}

export async function createIngredientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createIngredientInput.parse(req.body);
    res.status(201).json(await createIngredient(householdIdOf(req), input));
  } catch (error) {
    next(error);
  }
}

export async function updateIngredientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ingredientId } = ingredientParams.parse(req.params);
    const input = updateIngredientInput.parse(req.body);
    res.json(await updateIngredient(householdIdOf(req), ingredientId, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteIngredientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ingredientId } = ingredientParams.parse(req.params);
    await deleteIngredient(householdIdOf(req), ingredientId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
