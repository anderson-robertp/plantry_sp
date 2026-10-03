import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      householdId?: string;
      householdRole?: "owner" | "member";
    }
  }
}

export {};