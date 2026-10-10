import { Router } from "express";
import {
  getRecipeController,
  listRecipesController,
  createRecipeController,
  updateRecipeController,
  deleteRecipeController,
  saveGlobalRecipeController,
} from "../controllers/recipe.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();

router.get("/:householdId/recipes", authenticate, requireHouseholdMember, listRecipesController);
router.post("/:householdId/recipes", authenticate, requireHouseholdMember, createRecipeController);
router.get("/:householdId/recipes/:recipeId", authenticate, requireHouseholdMember, getRecipeController);
router.patch("/:householdId/recipes/:recipeId", authenticate, requireHouseholdMember, updateRecipeController);
router.delete("/:householdId/recipes/:recipeId", authenticate, requireHouseholdMember, deleteRecipeController);

// copy a global catalog recipe into this household
router.post(
  "/:householdId/recipes/from-global/:globalRecipeId",
  authenticate,
  requireHouseholdMember,
  saveGlobalRecipeController
);

export default router;