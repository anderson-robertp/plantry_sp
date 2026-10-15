import { MAX_PLAN_DAYS } from "./mealPlanConstants.js";

/** Whole days since 1970-01-01 for a "YYYY-MM-DD" string (UTC, so no time zone or DST drift). */
export function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * The smallest range covering `range` and `date`. Moving or adding a meal outside the plan's
 * dates stretches the plan instead of refusing, since people reshuffle their week all the time.
 * Returns null if stretching would make the plan longer than MAX_PLAN_DAYS.
 */
export function extendRange(range: DateRange, date: string, maxDays: number = MAX_PLAN_DAYS): DateRange | null {
  const startDate = date < range.startDate ? date : range.startDate; // ISO dates compare correctly as text
  const endDate = date > range.endDate ? date : range.endDate;
  if (dayNumber(endDate) - dayNumber(startDate) + 1 > maxDays) return null;
  return { startDate, endDate };
}
