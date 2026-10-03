import { Request, Response, NextFunction } from "express";
import {
  registerUser,
  loginUser,
  getUserById,
} from "../services/authService.js";


export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        message: "name, email, and password are required",
      });
      return;
    }

    const result = await registerUser(name, email, password);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        message: "email and password are required",
      });
      return;
    }

    const result = await loginUser(email, password);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const user = await getUserById(req.userId);

    res.json(user);
  } catch (error) {
    next(error);
  }
}