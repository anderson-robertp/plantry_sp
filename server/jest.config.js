/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  // sources import "./x.js"; Jest needs to find the x.ts behind it
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  transform: { "^.+\\.ts$": ["ts-jest", { useESM: true }] },
  testMatch: ["**/*.test.ts"],
  testTimeout: 30000,
  setupFiles: ["<rootDir>/src/config/zod-extend.ts"],
};