import { z } from "zod";

const payload = z.object({ sub: z.string().regex(/^[a-f\d]{24}$/i) }).passthrough();

/** Returns the user id from a decoded JWT payload, or null if it isn't one of ours. */
export function userIdFromPayload(decoded: unknown): string | null {
  const parsed = payload.safeParse(decoded);
  return parsed.success ? parsed.data.sub : null;
}
