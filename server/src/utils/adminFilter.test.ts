import { describe, expect, it } from "@jest/globals";
import { buildAdminIngredientFilter } from "./adminFilter.js";

describe("buildAdminIngredientFilter", () => {
  it("always limits to the shared catalog", () => {
    expect(buildAdminIngredientFilter({})).toEqual({ householdId: null });
  });

  it("searches names and aliases, escaping regex characters", () => {
    const f = buildAdminIngredientFilter({ search: "half (and) half" });
    expect(f.$or).toEqual([
      { normalizedName: { $regex: "half \\(and\\) half" } },
      { aliases: { $regex: "half \\(and\\) half" } },
    ]);
  });

  it("filters by category and by missing package", () => {
    expect(buildAdminIngredientFilter({ category: "baking", missing: "package" })).toEqual({
      householdId: null,
      category: "baking",
      package: { $exists: false },
    });
  });
});
