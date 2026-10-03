import { Household, type IHousehold }  from "../models/householdModel.js";
import { HouseholdMember } from "../models/householdMemberModel.js";
import mongoose from "mongoose";

export async function createHousehold(
  name: string,
  userId: string
) {
  const household = await Household.create({
    name,
  });

  await HouseholdMember.create({
    userId: new mongoose.Types.ObjectId(userId),
    householdId: household._id,
    role: "owner",
  });

  return household;
}


export async function getHouseholdsForUser(userId: string) {
  const objectId = new mongoose.Types.ObjectId(userId);

  const memberships = await HouseholdMember.find({
    userId: objectId,
  }).populate("householdId");

  return memberships;
}

export async function getHouseholdMembership(
  userId: string,
  householdId: string
) {
  if (!mongoose.isValidObjectId(householdId)) {
    return null;
  }

  return HouseholdMember.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    householdId: new mongoose.Types.ObjectId(householdId),
  });
}