import { AppError } from "../utils/errors.js";

/**
 * The storage steps household creation needs. Kept as an interface so the limit logic below can
 * be tested without a database; services/household.ts supplies the Mongoose implementation.
 */
export interface OwnershipStore<T extends { _id: unknown }> {
  /** How many households this user owns (memberships with role "owner"). */
  countOwned(userId: string): Promise<number>;
  createHousehold(name: string): Promise<T>;
  addOwner(householdId: T["_id"], userId: string): Promise<void>;
  /** Delete the household and any memberships pointing at it. */
  remove(householdId: T["_id"]): Promise<void>;
}

function planLimitError(limit: number, current: number): AppError {
  return new AppError(
    `Your plan allows ${limit} ${limit === 1 ? "household" : "households"}. Upgrade to create more.`,
    403,
    "plan_limit_reached",
    { limit, current }
  );
}

/**
 * Creates a household owned by `userId`, refusing once they own `limit` of them.
 *
 * Checking the count and then creating would let two simultaneous requests both pass. So after
 * creating we count again; if the user is over the limit, the new household is removed and the
 * request fails. Of any two racing requests at least the later one fails, and nobody ends up
 * over the limit. Under a true race both may fail, and the user simply retries.
 *
 * Any failure after the household exists (including the membership insert) removes it again, so
 * a household is never left behind with no owner.
 */
export async function createHouseholdWithinLimit<T extends { _id: unknown }>(
  store: OwnershipStore<T>,
  name: string,
  userId: string,
  limit: number
): Promise<T> {
  const before = await store.countOwned(userId);
  if (before >= limit) throw planLimitError(limit, before);

  const household = await store.createHousehold(name);
  try {
    await store.addOwner(household._id, userId);

    const after = await store.countOwned(userId);
    if (after > limit) throw planLimitError(limit, limit);
  } catch (error) {
    // Best effort: a failed cleanup must not hide the real error.
    await store.remove(household._id).catch(() => undefined);
    throw error;
  }
  return household;
}
