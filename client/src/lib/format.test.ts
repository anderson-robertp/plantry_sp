import { describe, expect, it } from "vitest";
import { amount, asList, daysUntil, expiryInfo, formatQty, localToday, refId, refName } from "./format";

describe("asList / refId / refName", () => {
  it("accepts a bare array, an { items } wrapper, or nothing", () => {
    expect(asList([1, 2])).toEqual([1, 2]);
    expect(asList({ items: [3] })).toEqual([3]);
    expect(asList(undefined)).toEqual([]);
    expect(asList({} as { items: number[] })).toEqual([]);
  });
  it("reads an id and name from a string or a populated object", () => {
    expect(refId("abc")).toBe("abc");
    expect(refId({ _id: "abc", name: "Pasta" })).toBe("abc");
    expect(refName("abc")).toBeUndefined();
    expect(refName({ _id: "abc", name: "Pasta" })).toBe("Pasta");
  });
});

describe("formatQty / amount", () => {
  it("rounds to two decimals with no trailing zeros", () => {
    expect(formatQty(100)).toBe("100");
    expect(formatQty(2.5)).toBe("2.5");
    expect(formatQty(0.3333333)).toBe("0.33");
    expect(formatQty(1.005 * 100)).toBe("100.5");
  });
  it("pairs a quantity with a readable unit", () => {
    expect(amount(2, "fl_oz")).toBe("2 fl oz");
    expect(amount(1.5, "cup")).toBe("1.5 cup");
  });
});

describe("dates", () => {
  it("localToday uses the local calendar day", () => {
    expect(localToday(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
    expect(localToday(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });
  it("daysUntil counts whole days, also across months and from full ISO timestamps", () => {
    expect(daysUntil("2026-10-19", "2026-10-17")).toBe(2);
    expect(daysUntil("2026-11-02T00:00:00.000Z", "2026-10-30")).toBe(3);
    expect(daysUntil("2026-10-10", "2026-10-17")).toBe(-7);
  });
  it("expiryInfo labels and tones", () => {
    const t = "2026-10-17";
    expect(expiryInfo(null, t)).toEqual({ text: "No expiry", tone: "none" });
    expect(expiryInfo("2026-10-16", t)).toEqual({ text: "Expired yesterday", tone: "expired" });
    expect(expiryInfo("2026-10-10", t)).toEqual({ text: "Expired 7 days ago", tone: "expired" });
    expect(expiryInfo("2026-10-17", t)).toEqual({ text: "Expires today", tone: "soon" });
    expect(expiryInfo("2026-10-18", t)).toEqual({ text: "Expires tomorrow", tone: "soon" });
    expect(expiryInfo("2026-10-20", t)).toEqual({ text: "Expires in 3 days", tone: "soon" });
    expect(expiryInfo("2026-10-21T00:00:00.000Z", t)).toEqual({ text: "Expires 2026-10-21", tone: "ok" });
  });
});

import { addDays, eachDay } from "./format";
describe("date helpers", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("lists days inclusive", () => {
    expect(eachDay("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(eachDay("2026-10-30", "2026-10-30")).toHaveLength(1);
  });
});

import { packageCountText, pluralize } from "./format";
describe("package text", () => {
  it("pluralizes labels", () => {
    expect(pluralize("can", 1)).toBe("can");
    expect(pluralize("can", 3)).toBe("cans");
    expect(pluralize("box", 2)).toBe("boxes");
    expect(pluralize("bunch", 2)).toBe("bunches");
    expect(pluralize("pantry", 2)).toBe("pantries");
    expect(pluralize("tray", 2)).toBe("trays");
  });
  it("says how many to buy", () => {
    expect(packageCountText("can", 3)).toBe("3 cans");
    expect(packageCountText("bag", 1)).toBe("1 bag");
  });
});

import { pickFocusPlan } from "./format";
describe("pickFocusPlan", () => {
  const plan = (id: string, startDate: string, endDate: string) => ({ id, startDate, endDate });
  it("prefers the plan that covers today", () => {
    const plans = [plan("past", "2026-10-01", "2026-10-07"), plan("now", "2026-10-26", "2026-11-01"), plan("next", "2026-11-02", "2026-11-08")];
    expect(pickFocusPlan(plans, "2026-10-28")?.id).toBe("now");
  });
  it("then the soonest upcoming, then the latest past", () => {
    const plans = [plan("past", "2026-10-01", "2026-10-07"), plan("far", "2026-12-01", "2026-12-07"), plan("next", "2026-11-02", "2026-11-08")];
    expect(pickFocusPlan(plans, "2026-10-20")?.id).toBe("next");
    expect(pickFocusPlan([plan("a", "2026-10-01", "2026-10-07"), plan("b", "2026-10-08", "2026-10-14")], "2026-11-01")?.id).toBe("b");
  });
  it("is null with no plans", () => {
    expect(pickFocusPlan([], "2026-10-20")).toBeNull();
  });
});

import { courseFromTags, courseOf, courseRank } from "./format";
describe("courses", () => {
  it("treats a missing course as main", () => {
    expect(courseOf({})).toBe("main");
    expect(courseOf({ course: "side" })).toBe("side");
  });
  it("guesses a course from tags", () => {
    expect(courseFromTags(["dinner", "Dessert"])).toBe("dessert");
    expect(courseFromTags(["side"])).toBe("side");
    expect(courseFromTags(["dinner"])).toBe("main");
    expect(courseFromTags(undefined)).toBe("main");
  });
  it("orders a meal appetizer, main, side, dessert, drink", () => {
    const sorted = ["dessert", "side", "main", "drink", "appetizer"].sort((a, b) => courseRank(a) - courseRank(b));
    expect(sorted).toEqual(["appetizer", "main", "side", "dessert", "drink"]);
  });
});
