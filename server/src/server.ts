import dotenv from "dotenv";
import app from "./app.js";
import { connectToDatabase } from "./config/database.js";

// Load environment variables from .env file

dotenv.config();

const PORT = process.env.PORT || 3000;

// Start the server after connecting to the database
async function startServer() {
    // Connect to the database
    try {
        await connectToDatabase();

        app.listen(PORT, () => {
            console.log(`Plantry API is running on port ${PORT}`);
            console.log(`Health check endpoint available at http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error("Error starting the Plantry API:", error);
        process.exit(1);
    }
}

// Call the startServer function to initiate the server
startServer();