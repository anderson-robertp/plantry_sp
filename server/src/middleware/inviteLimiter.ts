import rateLimit from "express-rate-limit";

/** Guesses at invite codes: 20 per IP per 15 minutes. A real person needs one or two. */
export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again in a few minutes." } },
});
