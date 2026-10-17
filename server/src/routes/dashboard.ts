import { Router } from "express";
import { getDashboardController } from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();

router.get("/:householdId/dashboard", authenticate, requireHouseholdMember, getDashboardController);

export default router;
