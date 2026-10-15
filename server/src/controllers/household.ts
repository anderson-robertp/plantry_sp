import type { NextFunction, Request, Response } from "express";
import { createHousehold, getHouseholdsForUser } from "../services/household.js";
import { AppError } from "../utils/errors.js";
import { createHouseholdInput } from "../validation/household.js";

/**
 * Same pattern as the other controllers: zod parse, service call, every failure to next(error)
 * so middleware/errorHandler.ts picks the status (ZodError -> 422, AppError -> its own status).
 */

function userIdOf(req: Request): string {
  if (!req.userId) {
    throw new AppError("Authentication required", 401, "unauthenticated");
  }
  return req.userId;
}

export async function createHouseholdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = userIdOf(req);
    const { name } = createHouseholdInput.parse(req.body);

    res.status(201).json(await createHousehold(name, userId));
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
    res.json(await getHouseholdsForUser(userIdOf(req)));
  } catch (error) {
    next(error);
  }
}
