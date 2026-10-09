import mongoose, { Document, Schema} from "mongoose";

// Define the IHouseholdMember interface
export interface IHouseholdMember extends Document {
    userId: mongoose.Types.ObjectId;
    householdId: mongoose.Types.ObjectId;
    role: "owner" | "member";
    createdAt: Date;
    updatedAt: Date;
}

// Define the HouseholdMember schema
const householdMemberSchema: Schema<IHouseholdMember> = new Schema<IHouseholdMember>({
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    householdId: { type: mongoose.Types.ObjectId, ref: "Household", required: true },
    role: { type: String, enum: ["owner", "member"], default: "member", required: true }
}, {
    timestamps: true
});

// Create a unique index on userId and householdId to prevent duplicate memberships
householdMemberSchema.index({ userId: 1, householdId: 1 }, { unique: true });

// Create the HouseholdMember model
export const HouseholdMember = mongoose.model<IHouseholdMember>("HouseholdMember", householdMemberSchema);
