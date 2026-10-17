import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { objectIdSchema } from "../validation/common.js";
import { dashboardQuery } from "../validation/dashboard.js";

type Security = Record<string, string[]>[];

export function registerDashboardPaths(registry: OpenAPIRegistry, security: Security): void {
  registry.registerPath({
    method: "get", path: "/api/households/{householdId}/dashboard", tags: ["Dashboard"], security,
    summary: "Home-screen summary",
    description:
      "pantry (expiring soon, already expired), upcomingMeals (next N days across plans), shoppingList (progress for the plan covering today, else the next one; null if none), recentCooks (last 5, undone ones excluded) and recipes { count, cookableNow }.",
    request: { params: z.object({ householdId: objectIdSchema }), query: dashboardQuery },
    responses: { 200: { description: "Dashboard summary" }, 401: { description: "Authentication required" }, 403: { description: "Not a household member" }, 422: { description: "Validation failed" } },
  });
}
