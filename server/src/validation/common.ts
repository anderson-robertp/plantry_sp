import { z } from "zod";
import { CANONICAL_UNITS, normalizeUnit } from "../utils/units.js";

/** 24-char hex ObjectId string, lowercased so it matches String(doc._id). */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
  .transform((s) => s.toLowerCase());

/**
 * Accepts "Tbsp.", "tablespoons", "CUPS", etc. and outputs the canonical unit
 * ("tbsp", "cup"). Anything unrecognized fails the enum check.
 */
export const unitSchema = z.preprocess(
  (v) => (typeof v === "string" ? normalizeUnit(v) ?? v : v),
  z.enum(CANONICAL_UNITS)
);

export const quantitySchema = z.number().nonnegative().max(10_000_000);

/** For routes like /recipes/:id */
export const idParams = z.object({ id: objectIdSchema });
