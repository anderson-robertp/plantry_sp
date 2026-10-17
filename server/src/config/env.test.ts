import { describe, expect, it } from "@jest/globals";
import { loadConfig } from "./env.js";

const good = { MONGODB_URI: "mongodb://localhost/plantry", JWT_SECRET: "x".repeat(32) };

describe("loadConfig", () => {
  it("accepts a minimal development setup and fills in defaults", () => {
    const c = loadConfig(good);
    expect(c).toMatchObject({ nodeEnv: "development", port: 3000, isProduction: false, corsOrigins: ["http://localhost:5173"] });
  });

  it("reads PORT as a number and splits CORS_ORIGIN into a trimmed list", () => {
    const c = loadConfig({ ...good, PORT: "8080", CORS_ORIGIN: "https://a.com, https://b.com ,," });
    expect(c.port).toBe(8080);
    expect(c.corsOrigins).toEqual(["https://a.com", "https://b.com"]);
  });

  it("accepts MONGO_URI as an alias", () => {
    expect(loadConfig({ MONGO_URI: "mongodb://x/y", JWT_SECRET: "x".repeat(32) }).mongoUri).toBe("mongodb://x/y");
  });

  it("refuses a missing database URI or a weak JWT secret, naming each problem", () => {
    expect(() => loadConfig({ JWT_SECRET: "x".repeat(32) })).toThrow(/MONGODB_URI/);
    expect(() => loadConfig({ MONGODB_URI: "m", JWT_SECRET: "short" })).toThrow(/JWT_SECRET must be at least 32/);
    expect(() => loadConfig({})).toThrow(/MONGODB_URI[\s\S]*JWT_SECRET/);
  });

  it("requires CORS_ORIGIN in production but not in development", () => {
    expect(() => loadConfig({ ...good, NODE_ENV: "production" })).toThrow(/CORS_ORIGIN is required in production/);
    const c = loadConfig({ ...good, NODE_ENV: "production", CORS_ORIGIN: "https://plantry.example" });
    expect(c.isProduction).toBe(true);
  });

  it("rejects an unknown NODE_ENV and a bad PORT", () => {
    expect(() => loadConfig({ ...good, NODE_ENV: "staging" })).toThrow();
    expect(() => loadConfig({ ...good, PORT: "abc" })).toThrow();
    expect(() => loadConfig({ ...good, PORT: "70000" })).toThrow();
  });
});
