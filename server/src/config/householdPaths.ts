import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { createHouseholdInput } from "../validation/household.js";

type Security = Record<string, string[]>[];

/** Mounted at /api/households (change `base` if your app.use() differs). */
const base = "/api/households";

export function registerHouseholdPaths(registry: OpenAPIRegistry, security: Security): void {
  const CreateHousehold = registry.register("CreateHousehold", createHouseholdInput);
  const tags = ["Households"];

  registry.registerPath({
    method: "post",
    path: base,
    summary: "Create a household (you become its owner; the free plan allows one). Copy the returned _id into the {householdId} of the other routes.",
    tags,
    security,
    request: { body: { content: { "application/json": { schema: CreateHousehold } } } },
    responses: {
      201: { description: "Household created" },
      401: { description: "Authentication required" },
      403: { description: "Plan limit reached (error.code is plan_limit_reached; details has limit and current)" },
      422: { description: "Validation failed (name is required, 1 to 100 characters)" },
    },
  });

  registry.registerPath({
    method: "get",
    path: base,
    summary: "List the households you belong to",
    tags,
    security,
    responses: {
      200: { description: "Households for the signed-in user" },
      401: { description: "Authentication required" },
    },
  });
}
