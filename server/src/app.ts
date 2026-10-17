import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { loadConfig } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import householdRoutes from "./routes/household.js";
import authRoutes from "./routes/auth.js";
import pantryRoutes from "./routes/pantry.js";
import globalRecipeRoutes from "./routes/globalRecipe.js";
import mealPlanRoutes from "./routes/mealPlan.js";
import recipeRoutes from "./routes/recipe.js";
import ingredientRoutes from "./routes/ingredient.js";
import recipeMatchRoutes from "./routes/recipeMatch.js"
import shoppingItemRoutes from "./routes/shoppingItem.js"
import dashboardRoutes from "./routes/dashboard.js"
import { errorHandler } from "./middleware/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./config/openapi.js";

const config = loadConfig(); // throws at startup on a bad environment
const app = express();

// Middleware to parse JSON request bodies
app.set("trust proxy", 1); // behind Render/Railway's proxy, so rate limiting sees real client IPs
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Health Check
app.get("/health", (_req, res) => {
  const up = mongoose.connection.readyState === 1;
  res.status(up ? 200 : 503).json({ status: up ? "ok" : "degraded" });
});

// Additional routes and middleware can be added here
app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/households", recipeMatchRoutes)
app.use("/api/households", householdRoutes);
app.use("/api/households", pantryRoutes);
app.use("/api/global-recipes", globalRecipeRoutes);
app.use("/api/households", mealPlanRoutes);
app.use("/api/households", recipeRoutes);
app.use("/api/households", ingredientRoutes);
app.use("/api/households", shoppingItemRoutes)
app.use("/api/households", dashboardRoutes)


// Error handling middleware
app.use(errorHandler)

export default app;