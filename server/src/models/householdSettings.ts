import mongoose, { Document, Schema, Types } from "mongoose";
import { UNIT_SYSTEM_CHOICES, type UnitSystemChoice } from "../utils/settings.js";

/** A household's shared settings; one document per household, created the first time they are saved. */
export interface IHouseholdSettings extends Document {
  householdId: Types.ObjectId;
  unitSystem?: UnitSystemChoice | undefined;
}

const schema = new Schema<IHouseholdSettings>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, unique: true },
    unitSystem: { type: String, enum: UNIT_SYSTEM_CHOICES },
  },
  { timestamps: true }
);

export const HouseholdSettings = mongoose.model<IHouseholdSettings>("HouseholdSettings", schema);
