import { z } from "zod";

export const createHouseholdInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdInput>;
