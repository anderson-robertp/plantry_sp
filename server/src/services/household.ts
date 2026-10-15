import { Household, type IHousehold } from "../models/household.js";
import { HouseholdMember } from "../models/householdMember.js";
import mongoose from "mongoose";
import { limitsFor, planOf } from "../utils/plans.js";
import { createHouseholdWithinLimit, type OwnershipStore } from "./householdLimits.js";

const ownershipStore: OwnershipStore<IHousehold> = {
  countOwned: (userId) =>
    HouseholdMember.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      role: "owner",
    }),

  createHousehold: (name) => Household.create({ name }),

  addOwner: async (householdId, userId) => {
    await HouseholdMember.create({
      userId: new mongoose.Types.ObjectId(userId),
      householdId: householdId as mongoose.Types.ObjectId,
      role: "owner",
    });
  },

  remove: async (householdId) => {
    await HouseholdMember.deleteMany({ householdId });
    await Household.deleteOne({ _id: householdId });
  },
};

/**
 * Creates a household with `userId` as its owner. Fails with 403 "plan_limit_reached" when the
 * user already owns as many households as their plan allows (see utils/plans.ts).
 */
export async function createHousehold(name: string, userId: string) {
  const { maxOwnedHouseholds } = limitsFor(await planOf(userId));
  return createHouseholdWithinLimit(ownershipStore, name, userId, maxOwnedHouseholds);
}

export async function getHouseholdsForUser(userId: string) {
  const objectId = new mongoose.Types.ObjectId(userId);

  const memberships = await HouseholdMember.find({
    userId: objectId,
  }).populate("householdId");

  return memberships;
}

export async function getHouseholdMembership(userId: string, householdId: string) {
  if (!mongoose.isValidObjectId(householdId)) {
    return null;
  }

  return HouseholdMember.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    householdId: new mongoose.Types.ObjectId(householdId),
  });
}
