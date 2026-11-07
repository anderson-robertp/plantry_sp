import mongoose, { Document, Schema, Types } from "mongoose";
import { UNIT_SYSTEM_CHOICES, type UnitSystemChoice } from "../utils/settings.js";

/** A household's shared settings; one document per household, created the first time they are saved. */
export interface IHouseholdSettings extends Document {
  householdId: Types.ObjectId;
  unitSystem?: UnitSystemChoice | undefined;
  householdSize?: number | undefined;
}

const schema = new Schema<IHouseholdSettings>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, unique: true },
    unitSystem: { type: String, enum: UNIT_SYSTEM_CHOICES },
    householdSize: { type: Number, min: 1, max: 30, validate: Number.isInteger },
  },
  { timestamps: true }
);

export const HouseholdSettings = mongoose.model<IHouseholdSettings>("HouseholdSettings", schema);
