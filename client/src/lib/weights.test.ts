import { describe, expect, it } from "vitest";
import { cupGrams, describeNeed, gramsPerMlFromCup, missingWeights, typicalCupGrams } from "./weights";

describe("missingWeights", () => {
  const beans = { baseUnitType: "mass", package: { size: 430, unit: "g" } } as const;

  it("needs nothing when the unit matches how the ingredient is measured", () => {
    expect(missingWeights({ baseUnitType: "mass" }, "oz")).toEqual([]);
    expect(missingWeights({ baseUnitType: "volume" }, "cup")).toEqual([]);
    expect(missingWeights({ baseUnitType: "count" }, "piece")).toEqual([]);
  });

  it("asks for a cup weight when a weighed thing is used by volume", () => {
    expect(missingWeights({ baseUnitType: "mass" }, "cup")).toEqual(["gramsPerMl"]);
    expect(missingWeights({ baseUnitType: "mass" }, "tbsp")).toEqual(["gramsPerMl"]);
    expect(missingWeights({ baseUnitType: "volume" }, "oz")).toEqual(["gramsPerMl"]);
    expect(missingWeights({ baseUnitType: "mass", gramsPerMl: 0.5 }, "cup")).toEqual([]);
  });

  it("asks for a piece weight when a weighed thing is counted, unless a package stands in", () => {
    expect(missingWeights({ baseUnitType: "mass" }, "piece")).toEqual(["gramsPerPiece"]);
    expect(missingWeights(beans, "piece")).toEqual([]);
    expect(missingWeights({ ...beans, gramsPerPiece: 100 }, "piece")).toEqual([]);
    expect(missingWeights({ baseUnitType: "mass", package: { size: 1, unit: "l" } }, "piece")).toEqual(["gramsPerPiece"]);
  });

  it("asks for both when volume meets count", () => {
    expect(missingWeights({ baseUnitType: "count" }, "cup").sort()).toEqual(["gramsPerMl", "gramsPerPiece"]);
    expect(missingWeights({ baseUnitType: "count", gramsPerPiece: 50 }, "cup")).toEqual(["gramsPerMl"]);
  });

  it("says nothing when the ingredient isn't known yet", () => {
    expect(missingWeights(null, "cup")).toEqual([]);
    expect(missingWeights({}, "cup")).toEqual([]);
  });
});

describe("cup helpers", () => {
  it("converts both ways", () => {
    expect(cupGrams(gramsPerMlFromCup(120))).toBe(120);
    expect(gramsPerMlFromCup(236.5882365)).toBeCloseTo(1, 6);
  });
  it("knows typical cups of common things, and doesn't guess otherwise", () => {
    expect(typicalCupGrams("All-purpose flour")).toBe(120);
    expect(typicalCupGrams("Flour")).toBe(120);
    expect(typicalCupGrams("Brown sugar")).toBe(213);
    expect(typicalCupGrams("Olive oil")).toBe(218);
    expect(typicalCupGrams("Rice")).toBe(185);
    expect(typicalCupGrams("Rice flour")).toBeNull();
    expect(typicalCupGrams("Pork and beans")).toBeNull();
  });
  it("describes the need", () => {
    expect(describeNeed(["gramsPerMl"])).toBe("how much 1 cup of it weighs");
    expect(describeNeed(["gramsPerPiece"])).toBe("how much one piece of it weighs");
    expect(describeNeed(["gramsPerMl", "gramsPerPiece"])).toMatch(/1 cup and how much one piece/);
  });
});
