import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { getHouseholdMembership } from "../services/householdServices.js";

export async function requireHouseholdMember(
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

    const { householdId } = req.params;

    if (
      typeof householdId !== "string" ||
      !mongoose.isValidObjectId(householdId)
    ) {
      res.status(400).json({
        message: "Invalid household ID",
      });
      return;
    }

    const membership = await getHouseholdMembership(
      req.userId,
      householdId
    );

    if (!membership) {
      res.status(403).json({
        message: "You are not a member of this household",
      });
      return;
    }

    req.householdId = householdId;
    req.householdRole = membership.role;

    next();
  } catch (error) {
    next(error);
  }
}