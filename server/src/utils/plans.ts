/**
 * What each plan allows. Every user is on "free" until billing exists.
 *
 * To add paid plans: add a `plan` field to the User model, make `planOf` return it, and nothing
 * else changes. The limit checks and error responses already read from here.
 */
export const PLAN_LIMITS = {
  free: { maxOwnedHouseholds: 1 },
  premium: { maxOwnedHouseholds: 5 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

/** The user's plan. Placeholder: replace with a lookup once users can subscribe. */
export async function planOf(_userId: string): Promise<Plan> {
  return "free";
}

export function limitsFor(plan: Plan) {
  return PLAN_LIMITS[plan];
}
