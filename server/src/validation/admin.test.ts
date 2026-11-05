import { describe, expect, it } from "@jest/globals";
import { adminListIngredientsQuery } from "./admin.js";

describe("adminListIngredientsQuery", () => {
  it("has defaults", () => {
    expect(adminListIngredientsQuery.parse({})).toEqual({ page: 1, limit: 50 });
  });

  it("accepts the filters", () => {
    const q = adminListIngredientsQuery.parse({ search: " flour ", category: "baking", missing: "package", page: "2", limit: "100" });
    expect(q).toEqual({ search: "flour", category: "baking", missing: "package", page: 2, limit: 100 });
  });

  it("rejects an unknown filter value or too large a page size", () => {
    expect(adminListIngredientsQuery.safeParse({ missing: "weights" }).success).toBe(false);
    expect(adminListIngredientsQuery.safeParse({ limit: "500" }).success).toBe(false);
    expect(adminListIngredientsQuery.safeParse({ category: "nope" }).success).toBe(false);
  });
});
