import { describe, expect, it } from "@jest/globals";
import { summarizeFavorites } from "./favorites.js";

describe("summarizeFavorites", () => {
  it("separates my favorites from the household tally", () => {
    const rows = [
      { userId: "a", recipeId: "r1" },
      { userId: "a", recipeId: "r2" },
      { userId: "b", recipeId: "r2" },
      { userId: "c", recipeId: "r2" },
      { userId: "b", recipeId: "r3" },
    ];
    expect(summarizeFavorites(rows, "a")).toEqual({
      mine: ["r1", "r2"],
      household: [
        { recipeId: "r2", count: 3 },
        { recipeId: "r1", count: 1 },
        { recipeId: "r3", count: 1 },
      ],
    });
    expect(summarizeFavorites(rows, "b").mine).toEqual(["r2", "r3"]);
  });

  it("copes with nothing and with duplicate rows", () => {
    expect(summarizeFavorites([], "a")).toEqual({ mine: [], household: [] });
    const dup = [
      { userId: "a", recipeId: "r1" },
      { userId: "a", recipeId: "r1" },
    ];
    expect(summarizeFavorites(dup, "a")).toEqual({ mine: ["r1"], household: [{ recipeId: "r1", count: 1 }] });
  });
});
