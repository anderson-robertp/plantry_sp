import { Router } from "express";
import {
  registerController,
  loginController,
  getCurrentUserController,
} from "../controllers/auth.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
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