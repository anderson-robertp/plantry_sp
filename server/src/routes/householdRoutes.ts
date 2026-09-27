import { Router } from "express";
import {
  createHouseholdController,
  getUserHouseholdsController,
} from "../controllers/householdController.js";

const router = Router();

router.post("/", createHouseholdController);

router.get("/user/:userId", getUserHouseholdsController);

export default router;