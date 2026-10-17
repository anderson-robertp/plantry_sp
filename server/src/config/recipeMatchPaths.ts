import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { recipeAvailabilityParams, recipeMatchQuery } from "../validation/recipeMatch.js";
import { objectIdSchema } from "../validation/common.js";
import { z } from "zod";

type Security = Record<string, string[]>[];
const base = "/api/households/{householdId}/recipes";

export function registerRecipeMatchPaths(registry: OpenAPIRegistry, security: Security): void {
  const tags = ["Recipes"];
  const householdId = z.object({ householdId: objectIdSchema });

  registry.registerPath({
    method: "get", path: `${base}/match`, tags, security,
    summary: "Recipes ranked by how well the pantry covers them",
    description: "Cookable recipes first, then highest coverage. Each recipe lists the ingredients still missing.",
    request: { params: householdId, query: recipeMatchQuery },
    responses: { 200: { description: "{ total, cookableCount, matches[] }" }, 401: { description: "Authentication required" }, 403: { description: "Not a household member" }, 422: { description: "Validation failed" } },
  });
  registry.registerPath({
    method: "get", path: `${base}/{recipeId}/availability`, tags, security,
    summary: "Can I cook this recipe, and what's missing?",
    request: { params: householdId.merge(recipeAvailabilityParams), query: recipeMatchQuery.omit({ limit: true, canCookOnly: true }) },
    responses: { 200: { description: "One match: canCook, coverage, missing[]" }, 404: { description: "Recipe not found" }, 422: { description: "Validation failed" } },
  });
}
