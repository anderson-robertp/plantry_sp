import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/plantry";
    if (!mongoURI) {
        throw new Error("MONGODB_URI is not defined in the environment variables.");
    }

    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
}