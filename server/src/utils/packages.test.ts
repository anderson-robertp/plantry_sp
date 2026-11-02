import { describe, expect, it } from "@jest/globals";
import { packageFitsType, packageSizeInBase, packagesFor } from "./packages.js";

const can = { label: "can", size: 15, unit: "oz" } as const;

describe("packageSizeInBase", () => {
  it("converts the size to grams, ml or pieces", () => {
    expect(packageSizeInBase(can)).toBeCloseTo(425.24, 1);
    expect(packageSizeInBase({ label: "carton", size: 1, unit: "l" })).toBe(1000);
    expect(packageSizeInBase({ label: "dozen", size: 12, unit: "piece" })).toBe(12);
  });
});

describe("packageFitsType", () => {
  it("requires the same kind of unit as the ingredient", () => {
    expect(packageFitsType(can, "mass")).toBe(true);
    expect(packageFitsType(can, "volume")).toBe(false);
  });
});

describe("packagesFor", () => {
  it("rounds up to whole packages and keeps the exact figure", () => {
    expect(packagesFor(1000, can)).toEqual({ count: 3, exact: 2.35 });
  });

  it("does not add a package for floating-point noise", () => {
    const size = packageSizeInBase(can);
    expect(packagesFor(size * 2 + 1e-10, can).count).toBe(2);
    expect(packagesFor(size * 2, can).count).toBe(2);
  });

  it("is zero when nothing is needed", () => {
    expect(packagesFor(0, can)).toEqual({ count: 0, exact: 0 });
    expect(packagesFor(-5, can)).toEqual({ count: 0, exact: 0 });
  });
});
