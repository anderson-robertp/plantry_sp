import { Types } from "mongoose";
import { HouseholdMember } from "../models/householdMember.js";
import { HouseholdSettings } from "../models/householdSettings.js";
import { UserPreferences } from "../models/userPreferences.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import { withHouseholdDefaults, withPreferenceDefaults } from "../utils/settings.js";
import type { UpdateHouseholdSettingsInput, UpdatePreferencesInput } from "../validation/settings.js";

export async function getPreferences(userId: string) {
  const doc = await UserPreferences.findOne({ userId: new Types.ObjectId(userId) }).lean();
  return withPreferenceDefaults(doc);
}

export async function updatePreferences(userId: string, input: UpdatePreferencesInput) {
  const doc = await UserPreferences.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: omitUndefined(input) },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  ).lean();
  return withPreferenceDefaults(doc);
}

/** The signed-in user's role in the household; a 404 if they aren't in it, so ids can't be probed. */
async function roleIn(userId: string, householdId: string): Promise<"owner" | "member"> {
  const m = await HouseholdMember.findOne({
    userId: new Types.ObjectId(userId),
    householdId: new Types.ObjectId(householdId),
  }).lean();
  if (!m) throw new NotFoundError("Household not found");
  return (m as unknown as { role: "owner" | "member" }).role;
}

export async function getHouseholdSettings(userId: string, householdId: string) {
  await roleIn(userId, householdId);
  const doc = await HouseholdSettings.findOne({ householdId: new Types.ObjectId(householdId) }).lean();
  return withHouseholdDefaults(doc);
}

export async function updateHouseholdSettings(userId: string, householdId: string, input: UpdateHouseholdSettingsInput) {
  if ((await roleIn(userId, householdId)) !== "owner") {
    throw new AppError("Only the owner can change household settings.", 403, "forbidden");
  }
  const doc = await HouseholdSettings.findOneAndUpdate(
    { householdId: new Types.ObjectId(householdId) },
    { $set: omitUndefined(input) },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  ).lean();
  return withHouseholdDefaults(doc);
}
