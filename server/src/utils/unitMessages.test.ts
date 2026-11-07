import { describe, expect, it } from "@jest/globals";
import { toBaseQuantity, UnitConversionError } from "./units.js";

describe("conversion errors are written for people", () => {
  it("say what to add for a cup of something weighed", () => {
    const run = () => toBaseQuantity(1, "cup", { baseUnitType: "mass" });
    expect(run).toThrow(UnitConversionError);
    expect(run).toThrow(/how much 1 cup of it weighs/);
    expect(run).toThrow(/gramsPerMl/);
    expect(run).toThrow(/g or oz/);
  });
  it("say what to add for counting something weighed", () => {
    expect(() => toBaseQuantity(2, "piece", { baseUnitType: "mass" })).toThrow(/how much one piece weighs/);
  });
});
