import { describe, expect, it } from "@jest/globals";
import { addDays, listProgress, pickFocusPlan, recentCooks, toExpiryItems, upcomingMeals, type PlanInput } from "./dashboardBuilder.js";

const D = (s: string) => new Date(`${s}T00:00:00Z`);

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-17", 0)).toBe("2026-10-17");
  });
});

describe("toExpiryItems", () => {
  const row = (id: string, name: string, exp: string) => ({ id, name, quantity: 1, unit: "g", expirationDate: D(exp) });
  it("counts whole days from today: today is 0, yesterday is -1", () => {
    const out = toExpiryItems([row("a", "Milk", "2026-10-17"), row("b", "Eggs", "2026-10-16"), row("c", "Rice", "2026-10-20")], "2026-10-17");
    expect(out.map((i) => [i.name, i.daysLeft])).toEqual([["Eggs", -1], ["Milk", 0], ["Rice", 3]]);
    expect(out[0]?.expirationDate).toBe("2026-10-16");
  });
  it("breaks ties by name", () => {
    expect(toExpiryItems([row("a", "Zest", "2026-10-18"), row("b", "Apple", "2026-10-18")], "2026-10-17").map((i) => i.name)).toEqual(["Apple", "Zest"]);
  });
});

describe("pickFocusPlan", () => {
  const p = (id: string, startDate: string, endDate: string) => ({ id, startDate, endDate });
  it("prefers the plan covering today, newest start first", () => {
    expect(pickFocusPlan([p("old", "2026-10-01", "2026-10-30"), p("new", "2026-10-15", "2026-10-20"), p("next", "2026-10-25", "2026-10-30")], "2026-10-17")?.id).toBe("new");
  });
  it("includes the first and last day", () => {
    expect(pickFocusPlan([p("a", "2026-10-17", "2026-10-17")], "2026-10-17")?.id).toBe("a");
  });
  it("falls back to the soonest upcoming plan, ignores finished ones, and can return null", () => {
    expect(pickFocusPlan([p("past", "2026-10-01", "2026-10-10"), p("later", "2026-11-01", "2026-11-05"), p("soon", "2026-10-20", "2026-10-25")], "2026-10-17")?.id).toBe("soon");
    expect(pickFocusPlan([p("past", "2026-10-01", "2026-10-10")], "2026-10-17")).toBeNull();
    expect(pickFocusPlan([], "2026-10-17")).toBeNull();
  });
});

describe("upcomingMeals", () => {
  const plan: PlanInput = {
    id: "p1", name: "Week",
    startDate: "2026-10-12", endDate: "2026-10-30",
    entries: [
      { id: "e1", date: "2026-10-16", slot: "dinner", recipeId: "r1", servings: 2 }, // yesterday
      { id: "e2", date: "2026-10-17", slot: "dinner", recipeId: "r2", servings: 4 },
      { id: "e3", date: "2026-10-17", slot: "breakfast", recipeId: "r1", servings: 1, cookedAt: new Date() },
      { id: "e4", date: "2026-10-23", slot: "lunch", recipeId: "r1", servings: 2 }, // day 7 (inside a 7-day window)
      { id: "e5", date: "2026-10-24", slot: "lunch", recipeId: "gone", servings: 2 }, // outside
    ],
  };
  const names = new Map([["r1", "Soup"], ["r2", "Stew"]]);
  it("keeps only the window [today, today + days), ordered by day then breakfast to snack", () => {
    const out = upcomingMeals([plan], names, "2026-10-17", 7);
    expect(out.map((m) => m.entryId)).toEqual(["e3", "e2", "e4"]);
  });
  it("flags cooked meals and names the recipe and plan", () => {
    const [first] = upcomingMeals([plan], names, "2026-10-17", 7);
    expect(first).toMatchObject({ cooked: true, recipeName: "Soup", planName: "Week", slot: "breakfast" });
  });
  it("a deleted recipe is labelled, not dropped", () => {
    const out = upcomingMeals([plan], names, "2026-10-24", 1);
    expect(out[0]?.recipeName).toBe("Deleted recipe");
  });
  it("merges meals from several plans", () => {
    const other: PlanInput = { id: "p2", startDate: "2026-10-17", endDate: "2026-10-18", entries: [{ id: "x", date: "2026-10-17", slot: "lunch", recipeId: "r2", servings: 1 }] };
    expect(upcomingMeals([plan, other], names, "2026-10-17", 1).map((m) => m.entryId)).toEqual(["e3", "x", "e2"]);
  });
});

describe("listProgress", () => {
  it("counts generated and added items together", () => {
    expect(listProgress({ id: "p" }, { items: [{ checked: true }, { checked: false }, {}], extraItems: [{ checked: true }] })).toMatchObject({ total: 4, checked: 2, remaining: 2, percentDone: 50 });
  });
  it("rounds, and an empty list is 100% done", () => {
    expect(listProgress({ id: "p" }, { items: [{ checked: true }, {}, {}], extraItems: [] })?.percentDone).toBe(33);
    expect(listProgress({ id: "p" }, { items: [], extraItems: [] })).toMatchObject({ total: 0, percentDone: 100 });
  });
  it("no list at all is null", () => {
    expect(listProgress({ id: "p" }, null)).toBeNull();
  });
});

describe("recentCooks", () => {
  it("serializes dates", () => {
    expect(recentCooks([{ id: "c", recipeId: "r", recipeName: "Soup", servings: 2, cookedAt: new Date("2026-10-17T12:00:00Z") }])[0]?.cookedAt).toBe("2026-10-17T12:00:00.000Z");
  });
});
