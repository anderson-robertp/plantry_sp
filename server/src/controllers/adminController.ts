import type { NextFunction, Request, Response } from "express";
import { isAdminUser } from "../middleware/requireAdmin.js";
import {
  adminCreateIngredient,
  adminGetIngredient,
  adminListIngredients,
  adminUpdateIngredient,
} from "../services/adminIngredient.js";
import { adminListIngredientsQuery } from "../validation/admin.js";
import { createIngredientInput, ingredientParams, updateIngredientInput } from "../validation/ingredient.js";

/** One line per change to shared data, so there is a trail of who changed what. */
function audit(req: Request, event: string, details: Record<string, unknown>): void {
  console.info(JSON.stringify({ event, by: req.userId, at: new Date().toISOString(), ...details }));
}

export async function adminStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ isAdmin: req.userId ? await isAdminUser(req.userId) : false });
  } catch (error) {
    next(error);
  }
}

export async function adminListIngredientsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await adminListIngredients(adminListIngredientsQuery.parse(req.query)));
  } catch (error) {
    next(error);
  }
}

export async function adminGetIngredientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ingredientId } = ingredientParams.parse(req.params);
    res.json(await adminGetIngredient(ingredientId));
  } catch (error) {
    next(error);
  }
}

export async function adminCreateIngredientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createIngredientInput.parse(req.body);
    const created = await adminCreateIngredient(input);
    audit(req, "admin.ingredient.create", { ingredientId: String(created._id), name: created.name });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateIngredientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ingredientId } = ingredientParams.parse(req.params);
    const input = updateIngredientInput.parse(req.body);
    const updated = await adminUpdateIngredient(ingredientId, input);
    audit(req, "admin.ingredient.update", { ingredientId, fields: Object.keys(input) });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}
