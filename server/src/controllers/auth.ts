import type { NextFunction, Request, Response } from "express";
import { loginInput, registerInput } from "../validation/auth.js";
import { getUserById, loginUser, registerUser } from "../services/auth.js";
import { AppError } from "../utils/errors.js";

export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = registerInput.parse(req.body);
    res.status(201).json(await registerUser(name, email, password));
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginInput.parse(req.body);
    res.json(await loginUser(email, password));
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUserController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError("Authentication required", 401, "unauthenticated");
    res.json({ user: await getUserById(req.userId) });
  } catch (error) {
    next(error);
  }
}
