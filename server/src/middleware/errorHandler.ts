import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

/** Register last: app.use(errorHandler) */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "validation_error",
        message: "Invalid request",
        issues: err.issues.map((i) => ({
          path: i.path.map(String).join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // express.json() failures (malformed JSON body)
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "bad_json", message: "Malformed JSON body" } });
    return;
  }

  // Mongo duplicate key
  if (err?.code === 11000) {
    res.status(409).json({ error: { code: "duplicate", message: "That already exists" } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong" } });
};
