import { describe, expect, it } from "@jest/globals";
import { expiryDay, selectActiveEntries } from "./activeEntries.js";

const e = (date: string, cookedAt?: Date) => ({ date, ...(cookedAt ? { cookedAt } : {}) });

describe("selectActiveEntries", () => {
  const entries = [e("2026-10-14"), e("2026-10-15"), e("2026-10-16", new Date()), e("2026-10-17")];

  it("without fromDate keeps everything not cooked", () => {
    expect(selectActiveEntries(entries).map((x) => x.date)).toEqual(["2026-10-14", "2026-10-15", "2026-10-17"]);
  });

  it("with fromDate also drops earlier days, keeping that day itself", () => {
    expect(selectActiveEntries(entries, "2026-10-15").map((x) => x.date)).toEqual(["2026-10-15", "2026-10-17"]);
  });

  it("a cooked meal in the future is still dropped", () => {
    expect(selectActiveEntries(entries, "2026-10-01").map((x) => x.date)).not.toContain("2026-10-16");
  });

  it("everything past gives an empty list, and an empty plan stays empty", () => {
    expect(selectActiveEntries(entries, "2027-01-01")).toEqual([]);
    expect(selectActiveEntries([], "2026-10-15")).toEqual([]);
  });

  it("keeps the original objects and does not mutate the input", () => {
    const copy = [...entries];
    const out = selectActiveEntries(entries, "2026-10-15");
    expect(out[0]).toBe(entries[1]);
    expect(entries).toEqual(copy);
  });
});

describe("expiryDay", () => {
  it("is the plan start when the plan hasn't begun or no fromDate is given", () => {
    expect(expiryDay("2026-10-15")).toBe("2026-10-15");
    expect(expiryDay("2026-10-15", "2026-10-10")).toBe("2026-10-15");
    expect(expiryDay("2026-10-15", "2026-10-15")).toBe("2026-10-15");
  });

  it("is today when the plan is already under way", () => {
    expect(expiryDay("2026-10-15", "2026-10-18")).toBe("2026-10-18");
  });
});
