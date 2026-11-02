export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
/** What a dish is within a meal. Older entries have none and count as "main". */
export const COURSES = ["main", "side", "appetizer", "dessert", "drink"] as const;
export type Course = (typeof COURSES)[number];

/** How quantities are shown on a shopping list. Storage and math are always metric base units. */
export const UNIT_SYSTEMS = ["metric", "us"] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

/** Longest plan we accept, in days (inclusive of both ends). */
export const MAX_PLAN_DAYS = 62;
