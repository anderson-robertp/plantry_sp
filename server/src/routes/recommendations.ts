import { Router } from "express";
import { recommendationsController } from "../controllers/recommendationsController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();
router.get("/:householdId/recommendations", authenticate, requireHouseholdMember, recommendationsController);
export default router;
