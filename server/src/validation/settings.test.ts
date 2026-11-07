import { describe, expect, it } from "@jest/globals";
import { updateHouseholdSettingsInput, updatePreferencesInput } from "./settings.js";

describe("updatePreferencesInput", () => {
  it("takes one or both settings", () => {
    expect(updatePreferencesInput.safeParse({ unitSystem: "metric" }).success).toBe(true);
    expect(updatePreferencesInput.safeParse({ measure: "weight" }).success).toBe(true);
    expect(updatePreferencesInput.safeParse({ unitSystem: "us", measure: "volume" }).success).toBe(true);
  });

  it("rejects an empty change and unknown values", () => {
    expect(updatePreferencesInput.safeParse({}).success).toBe(false);
    expect(updatePreferencesInput.safeParse({ unitSystem: "imperial" }).success).toBe(false);
    expect(updatePreferencesInput.safeParse({ measure: "mass" }).success).toBe(false);
  });
});

describe("updateHouseholdSettingsInput", () => {
  it("takes a household size from 1 to 30", () => {
    expect(updateHouseholdSettingsInput.safeParse({ householdSize: 4 }).success).toBe(true);
    for (const bad of [0, 31, 2.5, "4", null]) expect(updateHouseholdSettingsInput.safeParse({ householdSize: bad }).success).toBe(false);
  });

  it("takes the unit system", () => {
    expect(updateHouseholdSettingsInput.safeParse({ unitSystem: "us" }).success).toBe(true);
    expect(updateHouseholdSettingsInput.safeParse({}).success).toBe(false);
    expect(updateHouseholdSettingsInput.safeParse({ unitSystem: "x" }).success).toBe(false);
  });
});
