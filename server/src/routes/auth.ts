import { Router } from "express";
import { getCurrentUserController, loginController, registerController } from "../controllers/auth.js";
import { authenticate } from "../middleware/authenticate.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", authLimiter, registerController);
router.post("/login", authLimiter, loginController);
router.get("/me", authenticate, getCurrentUserController);

export default router;
