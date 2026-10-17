// Example wiring. Merge into your app.ts; the order matters.
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { loadConfig } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
// ...your other route imports

const config = loadConfig(); // throws at startup on a bad environment
export const app = express();

app.set("trust proxy", 1); // behind Render/Railway's proxy, so rate limiting sees real client IPs
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  const up = mongoose.connection.readyState === 1;
  res.status(up ? 200 : 503).json({ status: up ? "ok" : "degraded" });
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
// app.use("/api/households", ...); app.use("/api/global-recipes", ...); etc.

app.use(errorHandler); // always last
