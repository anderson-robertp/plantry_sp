import { describe, expect, it } from "vitest";
import { buildNav, groupIsActive, isUnder } from "./nav";

describe("isUnder", () => {
  it("matches a page and the pages below it, but not look-alikes", () => {
    expect(isUnder("/plans", "/plans")).toBe(true);
    expect(isUnder("/plans/abc", "/plans")).toBe(true);
    expect(isUnder("/plans/abc/shopping", "/plans")).toBe(true);
    expect(isUnder("/planshop", "/plans")).toBe(false);
    expect(isUnder("/", "/")).toBe(true);
    expect(isUnder("/pantry", "/")).toBe(false);
  });
});

describe("buildNav", () => {
  const groups = (admin: boolean) => buildNav(admin).flatMap((e) => (e.kind === "group" ? [e] : []));

  it("keeps the top level short", () => {
    expect(buildNav(false).map((e) => e.label)).toEqual(["Home", "Pantry", "Cook", "Plan", "Household"]);
  });

  it("puts every page in exactly one place", () => {
    const all = [...buildNav(true).flatMap((e) => (e.kind === "link" ? [e.to] : e.items.map((i) => i.to)))];
    expect(all.sort()).toEqual(["/", "/admin", "/match", "/pantry", "/people", "/plans", "/recipes", "/settings", "/shopping"]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("only shows Admin to admins", () => {
    expect(groups(false).flatMap((g) => g.items.map((i) => i.to))).not.toContain("/admin");
    expect(groups(true).flatMap((g) => g.items.map((i) => i.to))).toContain("/admin");
  });

  it("highlights the group that holds the current page", () => {
    const plan = groups(false).find((g) => g.key === "plan")!;
    expect(groupIsActive("/plans/123/shopping", plan.items)).toBe(true);
    expect(groupIsActive("/recipes", plan.items)).toBe(false);
  });
});
