import { Router } from "express";
import {
  checkShoppingItemController,
  createMealPlanController,
  deleteMealPlanController,
  generateShoppingListController,
  getMealPlanController,
  getShoppingListController,
  listMealPlansController,
  updateMealPlanController,
} from "../controllers/mealPlan.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();
const guard = [authenticate, requireHouseholdMember];

router.get("/:householdId/meal-plans", ...guard, listMealPlansController);
router.post("/:householdId/meal-plans", ...guard, createMealPlanController);
router.get("/:householdId/meal-plans/:planId", ...guard, getMealPlanController);
router.patch("/:householdId/meal-plans/:planId", ...guard, updateMealPlanController);
router.delete("/:householdId/meal-plans/:planId", ...guard, deleteMealPlanController);

router.post("/:householdId/meal-plans/:planId/shopping-list", ...guard, generateShoppingListController);
router.get("/:householdId/meal-plans/:planId/shopping-list", ...guard, getShoppingListController);
router.patch(
  "/:householdId/meal-plans/:planId/shopping-list/items/:ingredientId",
  ...guard,
  checkShoppingItemController
);

export default router;
