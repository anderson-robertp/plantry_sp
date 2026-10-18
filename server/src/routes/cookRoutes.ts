import { Router } from "express";
import { cookRecipeController, listCookLogController, undoCookController } from "../controllers/cookController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();
const guard = [authenticate, requireHouseholdMember];

router.post("/:householdId/recipes/:recipeId/cook", ...guard, cookRecipeController);
router.get("/:householdId/cooks", ...guard, listCookLogController);
router.post("/:householdId/cooks/:cookId/undo", ...guard, undoCookController);

export default router;
