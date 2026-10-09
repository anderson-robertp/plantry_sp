import type { RequestHandler } from "express";

/** Anything with zod's safeParse shape (works across zod versions). */
interface Parser {
  safeParse(
    data: unknown
  ): { success: true; data: unknown } | { success: false; error: unknown };
}

/**
 * Validate req.body or req.params with a zod schema. On success the parsed
 * (normalized, stripped) value replaces the original, so handlers only ever
 * see clean data. On failure the ZodError goes to the error handler (422).
 *
 *   router.post("/", validate(createRecipeInput), handler)
 *   router.patch("/:id", validate(idParams, "params"), validate(updateRecipeInput), handler)
 */
export function validate(schema: Parser, source: "body" | "params" = "body"): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    req[source] = result.data as never;
    next();
  };
}
