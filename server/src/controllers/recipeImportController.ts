import type { NextFunction, Request, Response } from "express";
import { previewRecipeImport } from "../services/recipeImport.js";
import { householdParams } from "../validation/invite.js";
import { previewImportInput } from "../validation/recipeImport.js";

export async function previewRecipeImportController(req: Request, res: Response, next: NextFunction) {
  try {
    const { householdId } = householdParams.parse(req.params);
    const { url } = previewImportInput.parse(req.body);
    res.json(await previewRecipeImport(householdId, url));
  } catch (error) {
    next(error);
  }
}
