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
  /** How many people usually eat together. null until someone says. */
  householdSize: number | null;
}

export const MIN_HOUSEHOLD_SIZE = 1;
export const MAX_HOUSEHOLD_SIZE = 30;

export const DEFAULT_PREFERENCES: UserPreferences = { unitSystem: "us", measure: "volume" };
export const DEFAULT_HOUSEHOLD_SETTINGS: HouseholdSettings = { unitSystem: "us", householdSize: null };

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/** A stored preferences document (or nothing yet) with defaults filled in. Bad stored values fall back too. */
export function withPreferenceDefaults(stored: { unitSystem?: unknown; measure?: unknown } | null | undefined): UserPreferences {
  return {
    unitSystem: pick(stored?.unitSystem, UNIT_SYSTEM_CHOICES, DEFAULT_PREFERENCES.unitSystem),
    measure: pick(stored?.measure, MEASURE_CHOICES, DEFAULT_PREFERENCES.measure),
  };
}

export function withHouseholdDefaults(stored: { unitSystem?: unknown; householdSize?: unknown } | null | undefined): HouseholdSettings {
  const size = stored?.householdSize;
  return {
    unitSystem: pick(stored?.unitSystem, UNIT_SYSTEM_CHOICES, DEFAULT_HOUSEHOLD_SETTINGS.unitSystem),
    householdSize:
      typeof size === "number" && Number.isInteger(size) && size >= MIN_HOUSEHOLD_SIZE && size <= MAX_HOUSEHOLD_SIZE ? size : null,
  };
}

/**
 * Who may change what. Any member can say how many people eat (everyone knows that); the unit system
 * is the owner's call because it changes what everyone sees on the shared shopping list.
 */
export function ownerRequired(change: { unitSystem?: unknown }): boolean {
  return change.unitSystem !== undefined;
}
