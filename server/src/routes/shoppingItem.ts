import { Router } from "express";
import {
  addCustomItemController,
  removeCustomItemController,
  removeGeneratedItemController,
  updateCustomItemController,
  updateGeneratedItemController,
} from "../controllers/shoppingItemController.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();
const guard = [authenticate, requireHouseholdMember];
const list = "/:householdId/meal-plans/:planId/shopping-list";

// items you add yourself
router.post(`${list}/custom-items`, ...guard, addCustomItemController);
router.patch(`${list}/custom-items/:itemId`, ...guard, updateCustomItemController);
router.delete(`${list}/custom-items/:itemId`, ...guard, removeCustomItemController);

// items generated from the plan (this PATCH replaces the old check-only one in mealPlanRoutes)
router.patch(`${list}/items/:ingredientId`, ...guard, updateGeneratedItemController);
router.delete(`${list}/items/:ingredientId`, ...guard, removeGeneratedItemController);

export default router;
