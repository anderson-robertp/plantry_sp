import { describe, expect, it } from "@jest/globals";
import { courseFromTags, rulesRecommender, type Candidate } from "./recommender.js";

const c = (o: Partial<Candidate>): Candidate => ({
  recipeId: "r", name: "Recipe", course: "main", coverage: 0, canCook: false, missingCount: 5,
  expiringNames: [], lovedBy: 0, daysSinceCooked: null, inPlan: false, totalMinutes: null, ...o,
});
const rank = (cs: Candidate[], ctx = {}) => rulesRecommender.recommend(cs, ctx).map((r) => r.recipeId);

describe("rulesRecommender", () => {
  it("puts cookable recipes ahead of ones that need shopping", () => {
    expect(rank([c({ recipeId: "far" }), c({ recipeId: "ready", canCook: true, coverage: 1, missingCount: 0 })])).toEqual(["ready", "far"]);
  });
  it("rewards using up food that is about to expire", () => {
    const out = rulesRecommender.recommend([c({ recipeId: "a" }), c({ recipeId: "b", expiringNames: ["Spinach"] })], {});
    expect(out[0]?.recipeId).toBe("b");
    expect(out[0]?.reasons.some((r) => r.code === "expiring")).toBe(true);
  });
  it("rewards favorites, more so when more people love it", () => {
    expect(rank([c({ recipeId: "one", lovedBy: 1 }), c({ recipeId: "two", lovedBy: 2 }), c({ recipeId: "none" })])).toEqual(["two", "one", "none"]);
  });
  it("holds back what was cooked this week and what is already in the plan", () => {
    expect(rank([c({ recipeId: "recent", daysSinceCooked: 2 }), c({ recipeId: "inplan", inPlan: true }), c({ recipeId: "fresh", daysSinceCooked: 40 })])).toEqual(["fresh", "recent", "inplan"]);
  });
  it("filters by course and by time", () => {
    expect(rank([c({ recipeId: "m" }), c({ recipeId: "s", course: "side" })], { course: "side" })).toEqual(["s"]);
    expect(rank([c({ recipeId: "slow", totalMinutes: 90 }), c({ recipeId: "fast", totalMinutes: 20 }), c({ recipeId: "unknown" })], { maxMinutes: 30 })).toEqual(["fast", "unknown"]);
  });
  it("is stable for ties (A to Z)", () => {
    expect(rank([c({ recipeId: "b", name: "Beans" }), c({ recipeId: "a", name: "Apple" })])).toEqual(["a", "b"]);
  });
  it("explains itself", () => {
    const [r] = rulesRecommender.recommend([c({ canCook: true, coverage: 1, missingCount: 0, lovedBy: 1 })], {});
    expect(r?.reasons.map((x) => x.code)).toEqual(["can_cook", "favorite"]);
  });
});

describe("courseFromTags", () => {
  it("reads side/dessert/etc, defaulting to main", () => {
    expect(courseFromTags(["Dessert", "easy"])).toBe("dessert");
    expect(courseFromTags(["quick"])).toBe("main");
    expect(courseFromTags(undefined)).toBe("main");
  });
});
