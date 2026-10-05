import { Router } from "express";
import {
  registerController,
  loginController,
  getCurrentUserController,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import {
  registerSchema,
  loginSchema,
} from "../validation/authValidation.js";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  registerController
);

router.post(
  "/login", 
  validate(loginSchema), 
  loginController
);

router.get(
  "/me", 
  authenticate, 
  getCurrentUserController
);

export default router;