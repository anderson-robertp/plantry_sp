import mongoose, { Document, Schema} from "mongoose";

// Define the IUser interface
export interface IUser extends Document {
    userId: mongoose.Types.ObjectId;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

// Define the User schema
const userSchema: Schema<IUser> = new Schema<IUser>({
    userId: { type: mongoose.Types.ObjectId, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }
}, {
    timestamps: true
});

// Create the User model
const User = mongoose.model<IUser>("User", userSchema);
export default User;