/**
 * Which planned meals still need ingredients bought for them.
 *
 * A meal drops out when it's been cooked (its ingredients are already used) or when it falls
 * before `fromDate` (the household's today; a meal that day-passed was skipped or improvised).
 * Without `fromDate` the whole plan counts, minus cooked meals.
 */
export function selectActiveEntries<T extends { date: string; cookedAt?: Date | null | undefined }>(
  entries: readonly T[],
  fromDate?: string
): T[] {
  return entries.filter((e) => !e.cookedAt && (!fromDate || e.date >= fromDate));
}

/**
 * The day pantry expiry is judged from: the plan's first day, or today if the plan is already
 * under way (a batch that expired last week doesn't count just because the plan began before it).
 */
export function expiryDay(planStartDate: string, fromDate?: string): string {
  return fromDate && fromDate > planStartDate ? fromDate : planStartDate;
}
