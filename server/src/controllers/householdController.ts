import { Request, Response, NextFunction } from "express";
import {
  createHousehold,
  getHouseholdsForUser,
} from "../services/householdServices.js";

export async function createHouseholdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, userId } = req.body;

    if (!name || !userId) {
      res.status(400).json({
        message: "name and userId are required",
      });
      return;
    }

    const household = await createHousehold(name, userId);

    res.status(201).json(household);
  } catch (error) {
    next(error);
  }
}

export async function getUserHouseholdsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    if (!userId || Array.isArray(userId)) {
      res.status(400).json({
        message: "A valid userId is required",
      });
      return;
    }

    const households = await getHouseholdsForUser(userId);

    res.json(households);
  } catch (error) {
    next(error);
  }
}