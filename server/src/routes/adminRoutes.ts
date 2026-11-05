import { Router } from "express";
import {
  adminCreateIngredientController,
  adminGetIngredientController,
  adminListIngredientsController,
  adminStatusController,
  adminUpdateIngredientController,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

// Any signed-in user may ask whether they are an admin (the app uses it to show the Admin tab).
router.get("/status", authenticate, adminStatusController);

// Everything below is admin only.
router.use(authenticate, requireAdmin);
router.get("/ingredients", adminListIngredientsController);
router.post("/ingredients", adminCreateIngredientController);
router.get("/ingredients/:ingredientId", adminGetIngredientController);
router.patch("/ingredients/:ingredientId", adminUpdateIngredientController);

export default router;
