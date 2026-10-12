import { Router } from "express";
import {
  createIngredientController,
  deleteIngredientController,
  getIngredientController,
  listIngredientsController,
  updateIngredientController,
} from "../controllers/ingredient.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();
const guard = [authenticate, requireHouseholdMember];

router.get("/:householdId/ingredients", ...guard, listIngredientsController);
router.post("/:householdId/ingredients", ...guard, createIngredientController);
router.get("/:householdId/ingredients/:ingredientId", ...guard, getIngredientController);
router.patch("/:householdId/ingredients/:ingredientId", ...guard, updateIngredientController);
router.delete("/:householdId/ingredients/:ingredientId", ...guard, deleteIngredientController);

export default router;
