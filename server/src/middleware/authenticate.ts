import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { verifyToken } from "../utils/jwt.js";
import { loadConfig } from "../config/env.js";

const config = loadConfig();

/** Accepts `Authorization: Bearer <token>`; sets req.userId. Every failure is the same 401. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
  const userId = match?.[1] ? verifyToken(match[1], config.jwtSecret) : null;
  if (!userId) return next(new AppError("Authentication required", 401, "unauthenticated"));
  req.userId = userId;
  next();
}
