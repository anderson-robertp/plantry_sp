import { Router, Request, Response, NextFunction } from "express";
import {
  createHouseholdController,
  getUserHouseholdsController,
} from "../controllers/householdController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHouseholdMember } from "../middleware/householdAuthMiddleware.js";

const router = Router();

router.post("/", authenticate, createHouseholdController);

router.get("/", authenticate, getUserHouseholdsController);

router.get(
  "/:householdId/test-auth",
  authenticate,
  requireHouseholdMember,
  (req: Request, res: Response) => {
    res.json({
      message: "Household authorization successful",
      householdId: req.householdId,
      role: req.householdRole,
      userId: req.userId,
    });
  }
);

export default router;