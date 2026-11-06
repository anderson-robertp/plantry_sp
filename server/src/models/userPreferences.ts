import mongoose, { Document, Schema, Types } from "mongoose";
import { MEASURE_CHOICES, UNIT_SYSTEM_CHOICES, type MeasureChoice, type UnitSystemChoice } from "../utils/settings.js";

/**
 * One person's display preferences. A separate collection (one document per user, created the
 * first time they save) so the User model doesn't change and nothing needs migrating.
 */
export interface IUserPreferences extends Document {
  userId: Types.ObjectId;
  unitSystem?: UnitSystemChoice | undefined;
  measure?: MeasureChoice | undefined;
}

const schema = new Schema<IUserPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    unitSystem: { type: String, enum: UNIT_SYSTEM_CHOICES },
    measure: { type: String, enum: MEASURE_CHOICES },
  },
  { timestamps: true }
);

export const UserPreferences = mongoose.model<IUserPreferences>("UserPreferences", schema);
