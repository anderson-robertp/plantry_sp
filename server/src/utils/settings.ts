export const UNIT_SYSTEM_CHOICES = ["us", "metric"] as const;
export type UnitSystemChoice = (typeof UNIT_SYSTEM_CHOICES)[number];

/** Whether dry ingredients are thought of by weight (grams, ounces) or by volume (cups, ml). */
export const MEASURE_CHOICES = ["weight", "volume"] as const;
export type MeasureChoice = (typeof MEASURE_CHOICES)[number];

/** One person's display preferences. */
export interface UserPreferences {
  unitSystem: UnitSystemChoice;
  measure: MeasureChoice;
}

/** A household's shared settings. */
export interface HouseholdSettings {
  unitSystem: UnitSystemChoice;
}

export const DEFAULT_PREFERENCES: UserPreferences = { unitSystem: "us", measure: "volume" };
export const DEFAULT_HOUSEHOLD_SETTINGS: HouseholdSettings = { unitSystem: "us" };

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/** A stored preferences document (or nothing yet) with defaults filled in. Bad stored values fall back too. */
export function withPreferenceDefaults(stored: { unitSystem?: unknown; measure?: unknown } | null | undefined): UserPreferences {
  return {
    unitSystem: pick(stored?.unitSystem, UNIT_SYSTEM_CHOICES, DEFAULT_PREFERENCES.unitSystem),
    measure: pick(stored?.measure, MEASURE_CHOICES, DEFAULT_PREFERENCES.measure),
  };
}

export function withHouseholdDefaults(stored: { unitSystem?: unknown } | null | undefined): HouseholdSettings {
  return { unitSystem: pick(stored?.unitSystem, UNIT_SYSTEM_CHOICES, DEFAULT_HOUSEHOLD_SETTINGS.unitSystem) };
}
