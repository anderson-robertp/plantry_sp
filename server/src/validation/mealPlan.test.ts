import {
  checkShoppingItemInput,
  createMealPlanInput,
  generateShoppingListInput,
  isoDateSchema,
  listMealPlansQuery,
  mealPlanParams,
  planDateIssues,
  shoppingItemParams,
  updateMealPlanInput,
} from "./mealPlan.js";
import { describe, expect, it } from "@jest/globals";

const ID = "Ab".repeat(12);
const ID_LOWER = ID.toLowerCase();
const entry = { date: "2026-10-12", slot: "dinner", recipeId: ID, servings: 4 };
const plan = { startDate: "2026-10-11", endDate: "2026-10-17", entries: [entry] };

describe("isoDateSchema", () => {
  it("accepts real dates", () => {
    expect(isoDateSchema.safeParse("2026-10-20").success).toBe(true);
    expect(isoDateSchema.safeParse("2028-02-29").success).toBe(true); // leap day
  });

  it("rejects bad formats and impossible dates", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "2026-1-5", "10/20/2026", "2026-10-20T00:00:00Z", "", "tomorrow"]) {
      expect(isoDateSchema.safeParse(bad).success).toBe(false);
    }
    expect(isoDateSchema.safeParse("2027-02-29").success).toBe(false); // not a leap year
  });
});

describe("planDateIssues", () => {
  it("is empty for a valid plan, including entries on the first and last day", () => {
    expect(planDateIssues(plan)).toEqual([]);
    expect(
      planDateIssues({
        ...plan,
        entries: [{ date: "2026-10-11" }, { date: "2026-10-17" }],
      })
    ).toEqual([]);
  });

  it("allows a one-day plan", () => {
    expect(planDateIssues({ startDate: "2026-10-11", endDate: "2026-10-11", entries: [{ date: "2026-10-11" }] })).toEqual([]);
  });

  it("flags end before start", () => {
    expect(planDateIssues({ startDate: "2026-10-12", endDate: "2026-10-11", entries: [] })).toEqual([
      "startDate must be on or before endDate",
    ]);
  });

  it("flags entries outside the range, numbering them from 1", () => {
    const issues = planDateIssues({
      ...plan,
      entries: [{ date: "2026-10-12" }, { date: "2026-10-10" }, { date: "2026-10-18" }],
    });
    expect(issues).toHaveLength(2);
    expect(issues[0]).toContain("Entry 2");
    expect(issues[1]).toContain("Entry 3");
  });

  it("limits the span to 62 days inclusive", () => {
    expect(planDateIssues({ startDate: "2026-10-01", endDate: "2026-12-01", entries: [] })).toEqual([]); // 62 days
    expect(planDateIssues({ startDate: "2026-10-01", endDate: "2026-12-02", entries: [] })).toHaveLength(1); // 63 days
  });
});

describe("createMealPlanInput", () => {
  it("accepts a valid plan and lowercases ids", () => {
    const out = createMealPlanInput.parse(plan);
    expect(out.entries[0]?.recipeId).toBe(ID_LOWER);
  });

  it("accepts an empty plan skeleton", () => {
    expect(createMealPlanInput.safeParse({ ...plan, entries: [] }).success).toBe(true);
  });

  it("reports date-range problems as validation issues", () => {
    const res = createMealPlanInput.safeParse({ ...plan, entries: [{ ...entry, date: "2026-11-01" }] });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toContain("outside");
    expect(createMealPlanInput.safeParse({ ...plan, startDate: "2026-10-20" }).success).toBe(false);
  });

  it("rejects bad slots, servings and recipe ids", () => {
    for (const bad of [
      { ...entry, slot: "brunch" },
      { ...entry, servings: 0 },
      { ...entry, servings: -1 },
      { ...entry, servings: 101 },
      { ...entry, recipeId: "nope" },
    ]) {
      expect(createMealPlanInput.safeParse({ ...plan, entries: [bad] }).success).toBe(false);
    }
  });

  it("allows fractional servings", () => {
    expect(createMealPlanInput.safeParse({ ...plan, entries: [{ ...entry, servings: 1.5 }] }).success).toBe(true);
  });

  it("caps the entry count", () => {
    expect(createMealPlanInput.safeParse({ ...plan, entries: Array(201).fill(entry) }).success).toBe(false);
  });
});

describe("updateMealPlanInput", () => {
  it("rejects an empty update and accepts partial ones without inventing defaults", () => {
    expect(updateMealPlanInput.safeParse({}).success).toBe(false);
    expect(updateMealPlanInput.parse({ name: "Week 42" })).toEqual({ name: "Week 42" });
  });

  it("still validates what is sent", () => {
    expect(updateMealPlanInput.safeParse({ startDate: "2026-02-30" }).success).toBe(false);
    expect(updateMealPlanInput.safeParse({ entries: [{ ...entry, slot: "brunch" }] }).success).toBe(false);
  });
});

describe("params, query and small bodies", () => {
  it("mealPlanParams / shoppingItemParams validate ids", () => {
    expect(mealPlanParams.parse({ planId: ID })).toEqual({ planId: ID_LOWER });
    expect(shoppingItemParams.parse({ planId: ID, ingredientId: ID })).toEqual({
      planId: ID_LOWER,
      ingredientId: ID_LOWER,
    });
    expect(shoppingItemParams.safeParse({ planId: ID }).success).toBe(false);
  });

  it("listMealPlansQuery defaults and validates", () => {
    expect(listMealPlansQuery.parse({})).toEqual({ page: 1, limit: 20 });
    expect(listMealPlansQuery.parse({ from: "2026-10-01", to: "2026-10-31", page: "2" })).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      page: 2,
      limit: 20,
    });
    expect(listMealPlansQuery.safeParse({ from: "soon" }).success).toBe(false);
    expect(listMealPlansQuery.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("generateShoppingListInput takes {} and rejects bad values", () => {
    expect(generateShoppingListInput.parse({})).toEqual({});
    expect(generateShoppingListInput.parse({ unitSystem: "us", includeStaples: true })).toEqual({
      unitSystem: "us",
      includeStaples: true,
    });
    expect(generateShoppingListInput.safeParse({ unitSystem: "imperial" }).success).toBe(false);
    expect(generateShoppingListInput.safeParse({ includeStaples: "yes" }).success).toBe(false);
  });

  it("checkShoppingItemInput needs a real boolean", () => {
    expect(checkShoppingItemInput.parse({ checked: true })).toEqual({ checked: true });
    expect(checkShoppingItemInput.safeParse({ checked: "true" }).success).toBe(false);
    expect(checkShoppingItemInput.safeParse({}).success).toBe(false);
  });
});
