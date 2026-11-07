import { describe, expect, it } from "@jest/globals";
import { DEFAULT_PREFERENCES, ownerRequired, withHouseholdDefaults, withPreferenceDefaults } from "./settings.js";

describe("withPreferenceDefaults", () => {
  it("fills in everything for someone who has never saved", () => {
    expect(withPreferenceDefaults(null)).toEqual(DEFAULT_PREFERENCES);
    expect(withPreferenceDefaults(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(withPreferenceDefaults({})).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps what was saved and fills in the rest", () => {
    expect(withPreferenceDefaults({ unitSystem: "metric" })).toEqual({ unitSystem: "metric", measure: "volume" });
    expect(withPreferenceDefaults({ measure: "weight" })).toEqual({ unitSystem: "us", measure: "weight" });
  });

  it("ignores values it doesn't know", () => {
    expect(withPreferenceDefaults({ unitSystem: "imperial", measure: 3 })).toEqual(DEFAULT_PREFERENCES);
  });
});

describe("withHouseholdDefaults", () => {
  it("defaults to US and accepts metric", () => {
    expect(withHouseholdDefaults(null)).toEqual({ unitSystem: "us", householdSize: null });
    expect(withHouseholdDefaults({ unitSystem: "metric" })).toEqual({ unitSystem: "metric", householdSize: null });
    expect(withHouseholdDefaults({ unitSystem: "x" })).toEqual({ unitSystem: "us", householdSize: null });
  });

  it("keeps a sensible household size and drops the rest", () => {
    expect(withHouseholdDefaults({ householdSize: 4 }).householdSize).toBe(4);
    for (const bad of [0, 31, 2.5, "4", -1, NaN]) expect(withHouseholdDefaults({ householdSize: bad }).householdSize).toBeNull();
  });
});

describe("ownerRequired", () => {
  it("only the unit system needs the owner", () => {
    expect(ownerRequired({ unitSystem: "metric" })).toBe(true);
    expect(ownerRequired({ unitSystem: "metric", householdSize: 3 } as never)).toBe(true);
    expect(ownerRequired({})).toBe(false);
    expect(ownerRequired({ householdSize: 3 } as never)).toBe(false);
  });
});
