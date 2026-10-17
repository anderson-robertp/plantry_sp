import type { NextFunction, Request, Response } from "express";
import {
  addCustomItem,
  removeCustomItem,
  removeGeneratedItem,
  updateCustomItem,
  updateGeneratedItem,
} from "../services/shoppingItems.js";
import { AppError } from "../utils/errors.js";
import {
  createCustomItemInput,
  customItemParams,
  generatedItemParams,
  updateCustomItemInput,
  updateGeneratedItemInput,
} from "../validation/shoppingItem.js";
import { objectIdSchema } from "../validation/common.js";
import { z } from "zod";

function householdIdOf(req: Request): string {
  if (!req.householdId) throw new AppError("Household ID is required", 400, "household_required");
  return req.householdId;
}

const planParams = z.object({ planId: objectIdSchema });

export async function addCustomItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId } = planParams.parse(req.params);
    res.status(201).json(await addCustomItem(householdId, planId, createCustomItemInput.parse(req.body)));
  } catch (error) {
    next(error);
  }
}

export async function updateCustomItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId, itemId } = customItemParams.parse(req.params);
    res.json(await updateCustomItem(householdId, planId, itemId, updateCustomItemInput.parse(req.body)));
  } catch (error) {
    next(error);
  }
}

export async function removeCustomItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId, itemId } = customItemParams.parse(req.params);
    res.json(await removeCustomItem(householdId, planId, itemId));
  } catch (error) {
    next(error);
  }
}

export async function updateGeneratedItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId, ingredientId } = generatedItemParams.parse(req.params);
    res.json(await updateGeneratedItem(householdId, planId, ingredientId, updateGeneratedItemInput.parse(req.body)));
  } catch (error) {
    next(error);
  }
}

export async function removeGeneratedItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const householdId = householdIdOf(req);
    const { planId, ingredientId } = generatedItemParams.parse(req.params);
    res.json(await removeGeneratedItem(householdId, planId, ingredientId));
  } catch (error) {
    next(error);
  }
}
