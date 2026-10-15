import { Router } from "express";
import {
  addPlanEntryController,
  removePlanEntryController,
  updatePlanEntryController,
} from "../controllers/mealPlanEntryController.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();
const guard = [authenticate, requireHouseholdMember];

router.post("/:householdId/meal-plans/:planId/entries", ...guard, addPlanEntryController);
router.patch("/:householdId/meal-plans/:planId/entries/:entryId", ...guard, updatePlanEntryController);
router.delete("/:householdId/meal-plans/:planId/entries/:entryId", ...guard, removePlanEntryController);

export default router;
