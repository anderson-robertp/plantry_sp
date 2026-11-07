import { describe, expect, it } from "@jest/globals";
import { fromBaseQuantity, toBaseQuantity, UnitConversionError, type ConvertibleIngredient } from "./units.js";

const beans: ConvertibleIngredient = { baseUnitType: "mass", package: { size: 430, unit: "g" } };
const canOz: ConvertibleIngredient = { baseUnitType: "mass", package: { size: 15, unit: "oz" } };
const milk: ConvertibleIngredient = { baseUnitType: "volume", package: { size: 1, unit: "l" } };

describe("a count with no piece weight means whole packages", () => {
  it("uses the package size", () => {
    expect(toBaseQuantity(1, "piece", beans)).toBe(430);
    expect(toBaseQuantity(2, "piece", beans)).toBe(860);
    expect(toBaseQuantity(1, "piece", canOz)).toBeCloseTo(425.2429, 3);
    expect(toBaseQuantity(0.5, "piece", milk)).toBe(500);
  });

  it("converts back for display", () => {
    expect(fromBaseQuantity(860, "piece", beans)).toBe(2);
    expect(fromBaseQuantity(250, "piece", milk)).toBe(0.25);
  });

  it("prefers a real piece weight over the package", () => {
    expect(toBaseQuantity(2, "piece", { ...beans, gramsPerPiece: 100 })).toBe(200);
  });

  it("still fails clearly with no package and no piece weight", () => {
    expect(() => toBaseQuantity(1, "piece", { baseUnitType: "mass" })).toThrow(UnitConversionError);
    expect(() => toBaseQuantity(1, "piece", { baseUnitType: "mass", package: null })).toThrow(UnitConversionError);
  });

  it("ignores a package in a unit that doesn't match how the ingredient is stored", () => {
    expect(() => toBaseQuantity(1, "piece", { baseUnitType: "mass", package: { size: 1, unit: "l" } })).toThrow(UnitConversionError);
  });

  it("leaves ordinary conversions alone", () => {
    expect(toBaseQuantity(2, "cup", milk)).toBeCloseTo(473.1765, 3);
    expect(toBaseQuantity(3, "piece", { baseUnitType: "count" })).toBe(3);
  });
});
