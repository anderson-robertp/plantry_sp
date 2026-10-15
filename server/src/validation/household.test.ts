import { createHouseholdInput } from "./household.js";
import { describe, expect, it } from "@jest/globals";

describe("createHouseholdInput", () => {
  it("trims the name", () => {
    expect(createHouseholdInput.parse({ name: "  The Smiths " })).toEqual({ name: "The Smiths" });
  });

  it("rejects missing, blank, non-string and over-long names", () => {
    for (const body of [{}, { name: "" }, { name: "   " }, { name: 5 }, { name: null }, { name: "x".repeat(101) }]) {
      expect(createHouseholdInput.safeParse(body).success).toBe(false);
    }
  });

  it("accepts exactly 100 characters", () => {
    expect(createHouseholdInput.safeParse({ name: "x".repeat(100) }).success).toBe(true);
  });

  it("strips unknown keys", () => {
    expect(createHouseholdInput.parse({ name: "Home", ownerId: "someone-else" })).toEqual({ name: "Home" });
  });

  it("a missing body (undefined) fails instead of throwing", () => {
    expect(createHouseholdInput.safeParse(undefined).success).toBe(false);
  });
});
