import mongoose, { Document, Schema} from "mongoose";

// Define the IUser interface
export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

// Define the User schema
const userSchema: Schema<IUser> = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }
}, {
    timestamps: true
});

// Create the User model
const User = mongoose.model<IUser>("User", userSchema);
export default User;