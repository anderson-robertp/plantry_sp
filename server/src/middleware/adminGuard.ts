import type { NextFunction, Request, Response } from "express";
import { isAdminEmail } from "../utils/admin.js";
import { AppError } from "../utils/errors.js";

interface Deps {
  /** The signed-in user's email, or null if the account is gone. */
  emailOf: (userId: string) => Promise<string | null>;
  /** The current admin list. Read on every request so a change takes effect without a redeploy of code. */
  admins: () => readonly string[];
}

/** Use after `authenticate`. Lets through only the emails in ADMIN_EMAILS; everyone else gets 403. */
export function createRequireAdmin({ emailOf, admins }: Deps) {
  return async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
    if (!req.userId) return next(new AppError("Authentication required", 401, "unauthenticated"));
    let email: string | null = null;
    try {
      email = await emailOf(req.userId);
    } catch {
      // an unknown account is simply not an admin
    }
    if (!isAdminEmail(email, admins())) return next(new AppError("Admin access required", 403, "forbidden"));
    next();
  };
}
