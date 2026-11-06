import { Router } from "express";
import {
  getHouseholdSettingsController,
  getPreferencesController,
  updateHouseholdSettingsController,
  updatePreferencesController,
} from "../controllers/settingsController.js";
import { authenticate } from "../middleware/authenticate.js";

/** Mount at /api/me. */
export const mePreferencesRoutes = Router();
mePreferencesRoutes.get("/preferences", authenticate, getPreferencesController);
mePreferencesRoutes.patch("/preferences", authenticate, updatePreferencesController);

/** Mount at /api/households, next to the other household routes. */
export const householdSettingsRoutes = Router();
householdSettingsRoutes.get("/:householdId/settings", authenticate, getHouseholdSettingsController);
householdSettingsRoutes.patch("/:householdId/settings", authenticate, updateHouseholdSettingsController);
