import express from "express";
import householdRoutes from "./routes/household.js";
import authRoutes from "./routes/auth.js";
import pantryRoutes from "./routes/pantry.js";
import globalRecipeRoutes from "./routes/globalRecipe.js";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./config/openapi.js";

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

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
app.use("/api/global-recipes", globalRecipeRoutes);

// Error handling middleware

export default app;