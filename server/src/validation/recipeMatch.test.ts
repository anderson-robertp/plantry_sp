import { describe, expect, it } from "@jest/globals";
import { recipeMatchQuery } from "./recipeMatch.js";

describe("recipeMatchQuery", () => {
  it("defaults the limit and leaves the rest unset", () => {
    expect(recipeMatchQuery.parse({})).toEqual({ limit: 50 });
  });
  it("reads booleans and numbers from query strings", () => {
    expect(recipeMatchQuery.parse({ canCookOnly: "true", includeStaples: "false", limit: "10", unitSystem: "us", today: "2026-10-17" })).toEqual({
      canCookOnly: true, includeStaples: false, limit: 10, unitSystem: "us", today: "2026-10-17",
    });
  });
  it("rejects junk", () => {
    for (const bad of [{ canCookOnly: "yes" }, { limit: "0" }, { limit: "500" }, { unitSystem: "imperial" }, { today: "tomorrow" }]) {
      expect(recipeMatchQuery.safeParse(bad).success).toBe(false);
    }
  });
});
