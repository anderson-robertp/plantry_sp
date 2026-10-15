import { describe, expect, it } from "@jest/globals";
import { limitsFor, PLAN_LIMITS, planOf } from "./plans.js";

describe("plans", () => {
  it("everyone is on the free plan until billing exists", async () => {
    expect(await planOf("any-user")).toBe("free");
  });

  it("free allows one owned household; premium allows more", () => {
    expect(limitsFor("free").maxOwnedHouseholds).toBe(1);
    expect(PLAN_LIMITS.premium.maxOwnedHouseholds).toBeGreaterThan(PLAN_LIMITS.free.maxOwnedHouseholds);
  });
});
