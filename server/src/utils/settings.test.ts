import { describe, expect, it } from "@jest/globals";
import { DEFAULT_PREFERENCES, withHouseholdDefaults, withPreferenceDefaults } from "./settings.js";

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
    expect(withHouseholdDefaults(null)).toEqual({ unitSystem: "us" });
    expect(withHouseholdDefaults({ unitSystem: "metric" })).toEqual({ unitSystem: "metric" });
    expect(withHouseholdDefaults({ unitSystem: "x" })).toEqual({ unitSystem: "us" });
  });
});
