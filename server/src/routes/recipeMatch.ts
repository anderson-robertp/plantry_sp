import { Router } from "express";
import { matchRecipesController, recipeAvailabilityController } from "../controllers/recipeMatch.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();
const guard = [authenticate, requireHouseholdMember];

// "match" is a fixed word, so mount this router BEFORE any router with GET /:householdId/recipes/:id
router.get("/:householdId/recipes/match", ...guard, matchRecipesController);
router.get("/:householdId/recipes/:recipeId/availability", ...guard, recipeAvailabilityController);

export default router;
