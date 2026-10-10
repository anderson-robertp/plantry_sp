import { Router } from "express";
import { saveGlobalRecipeController } from "../controllers/recipe.js";
import {
  getGlobalRecipeController,
  listGlobalRecipesController,
} from "../controllers/globalRecipe.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();

router.get("/", authenticate, listGlobalRecipesController);
router.get("/:globalRecipeId", authenticate, getGlobalRecipeController);
router.post(
  "/:householdId/recipes/from-global/:globalRecipeId",
  authenticate,
  requireHouseholdMember,
  saveGlobalRecipeController
);

export default router;