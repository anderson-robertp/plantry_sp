import { z } from "zod";
import dotenv from "dotenv"

dotenv.config();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (try: openssl rand -hex 32)"),
    /** Comma-separated list of front-end origins allowed to call the API. */
    CORS_ORIGIN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.CORS_ORIGIN) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CORS_ORIGIN"], message: "CORS_ORIGIN is required in production" });
    }
  });

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  mongoUri: string;
  jwtSecret: string;
  corsOrigins: string[];
  isProduction: boolean;
}

/**
 * Reads and checks the environment once, at startup. A missing or weak setting stops the server
 * with a plain message instead of failing on the first request that needs it.
 * (MONGO_URI is accepted as an alias for MONGODB_URI.)
 */
export function loadConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = schema.safeParse({ ...source, MONGODB_URI: source.MONGODB_URI ?? source.MONGO_URI });
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    mongoUri: env.MONGODB_URI,
    jwtSecret: env.JWT_SECRET,
    corsOrigins: (env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean),
    isProduction: env.NODE_ENV === "production",
  };
}
