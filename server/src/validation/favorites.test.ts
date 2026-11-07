import { describe, expect, it } from "@jest/globals";
import { favoriteParams } from "./favorites.js";

const id = "64b7f0f2a1b2c3d4e5f60718";

describe("favoriteParams", () => {
  it("accepts two object ids", () => {
    expect(favoriteParams.safeParse({ householdId: id, recipeId: id }).success).toBe(true);
  });
  it("rejects anything else", () => {
    expect(favoriteParams.safeParse({ householdId: id, recipeId: "nope" }).success).toBe(false);
    expect(favoriteParams.safeParse({ householdId: id }).success).toBe(false);
  });
});
