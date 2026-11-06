import { describe, expect, it } from "vitest";
import { defaultUnitFor, displayAmount, fractionText, type Prefs } from "./convert";

const flour = { baseUnitType: "mass", gramsPerMl: 0.53 } as const;
const butter = { baseUnitType: "mass", gramsPerMl: 0.96 } as const;
const milk = { baseUnitType: "volume", gramsPerMl: 1.03 } as const;
const salt = { baseUnitType: "mass", gramsPerMl: 1.2 } as const;
const egg = { baseUnitType: "count" } as const;

const metricWeight: Prefs = { unitSystem: "metric", measure: "weight" };
const metricVolume: Prefs = { unitSystem: "metric", measure: "volume" };
const usWeight: Prefs = { unitSystem: "us", measure: "weight" };
const usVolume: Prefs = { unitSystem: "us", measure: "volume" };

describe("fractionText", () => {
  it("writes fractions the way recipes do", () => {
    expect(fractionText(2)).toBe("2");
    expect(fractionText(0.5)).toBe("½");
    expect(fractionText(1.25)).toBe("1 ¼");
    expect(fractionText(1 / 3)).toBe("⅓");
    expect(fractionText(2.75)).toBe("2 ¾");
  });
  it("falls back to a decimal when there is no matching fraction", () => {
    expect(fractionText(1.1)).toBe("1.1");
  });
});

describe("displayAmount: weight and volume", () => {
  it("shows cups of flour as grams for someone who weighs", () => {
    expect(displayAmount({ quantity: 2, unit: "cup" }, flour, metricWeight)).toEqual({ text: "250 g", converted: true });
  });

  it("shows grams of flour as cups for someone who measures by volume", () => {
    expect(displayAmount({ quantity: 250, unit: "g" }, flour, usVolume).text).toBe("2 cups");
    expect(displayAmount({ quantity: 125, unit: "g" }, flour, usVolume).text).toBe("1 cup");
  });

  it("a pound of butter is two cups", () => {
    expect(displayAmount({ quantity: 1, unit: "lb" }, butter, usVolume).text).toBe("2 cups");
  });

  it("goes the other way in US weight: ounces and pounds", () => {
    expect(displayAmount({ quantity: 1, unit: "cup" }, flour, usWeight).text).toBe("4 ½ oz");
    expect(displayAmount({ quantity: 8, unit: "cup" }, flour, usWeight).text).toBe("2 ¼ lb");
  });

  it("leaves a liquid a liquid, whatever the weight preference", () => {
    expect(displayAmount({ quantity: 1, unit: "cup" }, milk, metricWeight).text).toBe("240 ml");
    expect(displayAmount({ quantity: 500, unit: "ml" }, milk, usWeight).text).toBe("2 cups");
  });

  it("leaves pieces alone", () => {
    expect(displayAmount({ quantity: 2, unit: "piece" }, egg, metricWeight)).toEqual({ text: "2", converted: false });
  });
});

describe("displayAmount: leaving things alone", () => {
  it("keeps small spoon amounts as spoons, even for someone who weighs", () => {
    expect(displayAmount({ quantity: 1, unit: "tsp" }, salt, metricWeight)).toEqual({ text: "1 tsp", converted: false });
    expect(displayAmount({ quantity: 2, unit: "tbsp" }, flour, metricWeight).converted).toBe(false);
  });

  it("converts a larger number of spoons", () => {
    expect(displayAmount({ quantity: 8, unit: "tbsp" }, milk, metricVolume).text).toBe("120 ml");
  });

  it("does not touch an amount already in the person's system and kind", () => {
    expect(displayAmount({ quantity: 1.5, unit: "cup" }, flour, usVolume)).toEqual({ text: "1 ½ cups", converted: false });
    expect(displayAmount({ quantity: 300, unit: "g" }, flour, metricWeight)).toEqual({ text: "300 g", converted: false });
  });

  it("converts only the system when weight and volume can't be crossed (no density)", () => {
    const mystery = { baseUnitType: "mass" } as const;
    expect(displayAmount({ quantity: 1, unit: "cup" }, mystery, metricWeight).text).toBe("240 ml");
    expect(displayAmount({ quantity: 500, unit: "g" }, mystery, usVolume).text).toBe("1 lb");
    expect(displayAmount({ quantity: 1, unit: "cup" }, undefined, metricVolume).text).toBe("240 ml");
  });

  it("shows nonsense as written instead of guessing", () => {
    expect(displayAmount({ quantity: 0, unit: "cup" }, flour, metricWeight).converted).toBe(false);
    expect(displayAmount({ quantity: Number.NaN, unit: "g" }, flour, metricWeight).converted).toBe(false);
  });
});

describe("displayAmount: rounding", () => {
  it("rounds metric amounts to numbers a person would weigh out", () => {
    expect(displayAmount({ quantity: 1, unit: "cup" }, flour, metricWeight).text).toBe("125 g");
    expect(displayAmount({ quantity: 3, unit: "lb" }, flour, metricWeight).text).toBe("1.35 kg");
  });

  it("rounds US volumes to quarters and thirds, and eighths when those would be well off", () => {
    expect(displayAmount({ quantity: 100, unit: "ml" }, milk, usVolume).text).toBe("⅜ cup");
    expect(displayAmount({ quantity: 80, unit: "ml" }, milk, usVolume).text).toBe("⅓ cup");
  });

  it("uses tablespoons and teaspoons for small US amounts converted from ml", () => {
    expect(displayAmount({ quantity: 30, unit: "ml" }, milk, usVolume).text).toBe("2 tbsp");
    expect(displayAmount({ quantity: 5, unit: "ml" }, milk, usVolume).text).toBe("1 tsp");
  });
});

describe("defaultUnitFor", () => {
  it("starts a line in the unit the person thinks in", () => {
    expect(defaultUnitFor(flour, usVolume)).toBe("cup");
    expect(defaultUnitFor(flour, metricVolume)).toBe("ml");
    expect(defaultUnitFor(flour, metricWeight)).toBe("g");
    expect(defaultUnitFor(flour, usWeight)).toBe("oz");
  });

  it("falls back to weight when the density is unknown", () => {
    expect(defaultUnitFor({ baseUnitType: "mass" }, usVolume)).toBe("oz");
    expect(defaultUnitFor({ baseUnitType: "mass" }, metricVolume)).toBe("g");
  });

  it("liquids are volumes and counts are pieces", () => {
    expect(defaultUnitFor(milk, usWeight)).toBe("cup");
    expect(defaultUnitFor(milk, metricWeight)).toBe("ml");
    expect(defaultUnitFor(egg, usWeight)).toBe("piece");
  });
});
