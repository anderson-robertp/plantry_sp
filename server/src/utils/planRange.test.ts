import { describe, expect, it } from "@jest/globals";
import { dayNumber, extendRange } from "./planRange.js";

const range = { startDate: "2026-10-15", endDate: "2026-10-21" };

describe("dayNumber", () => {
  it("counts days and is not thrown off by a daylight-saving change", () => {
    expect(dayNumber("2026-03-09") - dayNumber("2026-03-08")).toBe(1);
    expect(dayNumber("2026-11-02") - dayNumber("2026-11-01")).toBe(1);
    expect(dayNumber("2026-10-21") - dayNumber("2026-10-15")).toBe(6);
  });
});

describe("extendRange", () => {
  it("leaves the range alone for a date inside it, including the edges", () => {
    for (const d of ["2026-10-15", "2026-10-18", "2026-10-21"]) expect(extendRange(range, d)).toEqual(range);
  });

  it("stretches the end for a later date", () => {
    expect(extendRange(range, "2026-10-24")).toEqual({ startDate: "2026-10-15", endDate: "2026-10-24" });
  });

  it("stretches the start for an earlier date", () => {
    expect(extendRange(range, "2026-10-12")).toEqual({ startDate: "2026-10-12", endDate: "2026-10-21" });
  });

  it("works across a month and year boundary", () => {
    expect(extendRange({ startDate: "2026-12-30", endDate: "2026-12-31" }, "2027-01-02")).toEqual({
      startDate: "2026-12-30",
      endDate: "2027-01-02",
    });
  });

  it("returns null when stretching would pass the maximum length", () => {
    expect(extendRange(range, "2027-03-01")).toBeNull();
  });

  it("allows exactly the maximum and refuses one day more", () => {
    const one = { startDate: "2026-10-01", endDate: "2026-10-01" };
    expect(extendRange(one, "2026-10-05", 5)).toEqual({ startDate: "2026-10-01", endDate: "2026-10-05" });
    expect(extendRange(one, "2026-10-06", 5)).toBeNull();
  });

  it("does not modify its input", () => {
    const copy = { ...range };
    extendRange(copy, "2026-10-30");
    expect(copy).toEqual(range);
  });
});
