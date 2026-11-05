import { z } from "zod";
import { objectIdSchema } from "./common.js";

/** What someone pastes or types to join: the link's token or the short code. */
export const inviteSecretInput = z.object({
  secret: z.string().trim().min(1, "Enter the invite link or code").max(500),
});

export const householdParams = z.object({ householdId: objectIdSchema });
export const inviteParams = z.object({ householdId: objectIdSchema, inviteId: objectIdSchema });
export const memberParams = z.object({ householdId: objectIdSchema, userId: objectIdSchema });
