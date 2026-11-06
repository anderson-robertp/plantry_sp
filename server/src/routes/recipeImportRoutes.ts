import { Router } from "express";
import { previewRecipeImportController } from "../controllers/recipeImportController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";
import { importLimiter } from "../middleware/importLimiter.js";

/** Mount at /api/households, next to the other household routes. */
const router = Router();
router.post("/:householdId/recipe-imports/preview", authenticate, requireHouseholdMember, importLimiter, previewRecipeImportController);

export default router;
