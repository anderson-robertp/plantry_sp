import rateLimit from "express-rate-limit";

/** Every import makes the server fetch a page, so keep it modest: 30 per IP per 15 minutes. */
export const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "That's a lot of imports. Try again in a few minutes." } },
});
