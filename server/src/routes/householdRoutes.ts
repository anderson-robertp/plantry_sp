import { Router } from "express";
import {
  createHouseholdController,
  getUserHouseholdsController,
} from "../controllers/householdController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", authenticate, createHouseholdController);

router.get("/", authenticate, getUserHouseholdsController);

export default router;