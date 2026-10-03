import mongoose, { Document, Schema } from "mongoose";

// Define the IHousehold interface
export interface IHousehold extends Document {
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

// Define the Household schema
const householdSchema: Schema<IHousehold> = new Schema<IHousehold>({
    name: { type: String, required: true },
}, {
    timestamps: true
});

// Create the Household model
export const Household = mongoose.model<IHousehold>("Household", householdSchema);
