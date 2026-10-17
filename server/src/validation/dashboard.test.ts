import { describe, expect, it } from "@jest/globals";
import { dashboardQuery } from "./dashboard.js";

describe("dashboardQuery", () => {
  it("fills defaults", () => {
    expect(dashboardQuery.parse({})).toEqual({ expiringWithinDays: 7, upcomingDays: 7 });
  });
  it("reads numbers and a date from the query string", () => {
    expect(dashboardQuery.parse({ today: "2026-10-17", expiringWithinDays: "3", upcomingDays: "14" })).toEqual({ today: "2026-10-17", expiringWithinDays: 3, upcomingDays: 14 });
  });
  it("rejects out-of-range values and fake dates", () => {
    for (const bad of [{ expiringWithinDays: "0" }, { expiringWithinDays: "31" }, { upcomingDays: "15" }, { upcomingDays: "x" }, { today: "2026-02-30" }]) {
      expect(dashboardQuery.safeParse(bad).success).toBe(false);
    }
  });
});
