import { Router } from "express";
import {
  getPantryController,
  addPantryItemController,
  updatePantryItemController,
  deletePantryItemController,
} from "../controllers/pantry.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";
import { validate } from "../middleware/validation.js";
import {
  addPantryItemSchema,
  updatePantryItemSchema,
} from "../validation/pantryValidation.js";

const router = Router();

router.get(
  "/:householdId/pantry",
  authenticate,
  requireHouseholdMember,
  getPantryController
);

router.post(
  "/:householdId/pantry",
  authenticate,
  requireHouseholdMember,
  validate(addPantryItemSchema),
  addPantryItemController
);

router.put(
  "/:householdId/pantry/:pantryItemId",
  authenticate,
  requireHouseholdMember,
  updatePantryItemController
);

router.delete(
  "/:householdId/pantry/:pantryItemId",
  authenticate,
  requireHouseholdMember,
  deletePantryItemController
);

export default router;