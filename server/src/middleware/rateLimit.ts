import rateLimit from "express-rate-limit";

const body = (message: string) => ({ error: { code: "rate_limited", message } });

/** Brute-force guard for login/register: 10 attempts per IP per 15 minutes. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: body("Too many attempts. Try again in a few minutes."),
});

/** Loose ceiling for everything else. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: body("Too many requests. Slow down."),
});
