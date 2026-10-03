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
    const { name } = req.body;

    if (!name) {
      res.status(400).json({
        message: "name is required",
      });
      return;
    }

    if (!req.userId) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const household = await createHousehold(
      name,
      req.userId
    );

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
    if (!req.userId) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const households = await getHouseholdsForUser(
      req.userId
    );

    res.json(households);
  } catch (error) {
    next(error);
  }
}