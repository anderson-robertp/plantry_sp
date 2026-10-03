import express from "express";
import householdRoutes from "./routes/householdRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import pantryRoutes from "./routes/pantryRoutes.js";

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "ok",
        application: "Plantry API",
        version: "1.0.0"
    });
});

// Additional routes and middleware can be added here
app.use("/api/households", householdRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/households", pantryRoutes);

// Error handling middleware

export default app;