import { Router } from "express";
import { addFavoriteController, listFavoritesController, removeFavoriteController } from "../controllers/favoritesController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

/** Mount at /api/households, next to the other household routes. */
const router = Router();
const guard = [authenticate, requireHouseholdMember];

router.get("/:householdId/favorites", ...guard, listFavoritesController);
router.put("/:householdId/recipes/:recipeId/favorite", ...guard, addFavoriteController);
router.delete("/:householdId/recipes/:recipeId/favorite", ...guard, removeFavoriteController);

export default router;
