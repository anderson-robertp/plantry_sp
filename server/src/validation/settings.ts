import { z } from "zod";
import { MAX_HOUSEHOLD_SIZE, MEASURE_CHOICES, MIN_HOUSEHOLD_SIZE, UNIT_SYSTEM_CHOICES } from "../utils/settings.js";

/** PATCH /api/me/preferences: send only what changes. */
export const updatePreferencesInput = z
  .object({
    unitSystem: z.enum(UNIT_SYSTEM_CHOICES).optional(),
    measure: z.enum(MEASURE_CHOICES).optional(),
  })
  .refine((o) => Object.values(o).some((v) => v !== undefined), { message: "Provide at least one setting" });

/** PATCH /api/households/:id/settings */
export const updateHouseholdSettingsInput = z
  .object({
    unitSystem: z.enum(UNIT_SYSTEM_CHOICES).optional(),
    householdSize: z.number().int().min(MIN_HOUSEHOLD_SIZE).max(MAX_HOUSEHOLD_SIZE).optional(),
  })
  .refine((o) => Object.values(o).some((v) => v !== undefined), { message: "Provide at least one setting" });

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInput>;
export type UpdateHouseholdSettingsInput = z.infer<typeof updateHouseholdSettingsInput>;
