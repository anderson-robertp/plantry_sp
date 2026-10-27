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
