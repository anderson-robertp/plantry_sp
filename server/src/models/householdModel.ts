import mongoose, { Document, Schema } from "mongoose";

// Define the IHousehold interface
export interface IHousehold extends Document {
    householdId: mongoose.Types.ObjectId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

// Define the Household schema
const householdSchema: Schema<IHousehold> = new Schema<IHousehold>({
    householdId: { type: mongoose.Types.ObjectId, required: true, unique: true },
    name: { type: String, required: true },
}, {
    timestamps: true
});

// Create the Household model
export const Household = mongoose.model<IHousehold>("Household", householdSchema);
