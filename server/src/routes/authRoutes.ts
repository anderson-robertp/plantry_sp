import { Router } from "express";
import {
  registerController,
  loginController,
  getCurrentUserController,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/me", authenticate, getCurrentUserController);

export default router;