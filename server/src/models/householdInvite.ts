import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * An invitation to join a household. Only hashes of the link token and the short code are
 * stored, so a database leak doesn't hand out working invites. Each invite works once.
 */
export interface IHouseholdInvite extends Document {
  householdId: Types.ObjectId;
  createdBy: Types.ObjectId;
  tokenHash: string;
  codeHash: string;
  expiresAt: Date;
  revokedAt?: Date | undefined;
  acceptedAt?: Date | undefined;
  acceptedBy?: Types.ObjectId | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const householdInviteSchema = new Schema<IHouseholdInvite>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    acceptedAt: { type: Date },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// "this household's open invites"
householdInviteSchema.index({ householdId: 1, acceptedAt: 1, revokedAt: 1, expiresAt: 1 });
// Old invites tidy themselves away 30 days after they expire.
householdInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const HouseholdInvite = mongoose.model<IHouseholdInvite>("HouseholdInvite", householdInviteSchema);
