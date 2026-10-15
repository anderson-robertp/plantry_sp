import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { objectIdSchema } from "../validation/common.js";
import { cookParams, cookRecipeInput, cookRecipeParams, listCookLogQuery } from "../validation/cook.js";

type Security = Record<string, string[]>[];

const HouseholdParams = z.object({ householdId: objectIdSchema });
const base = "/api/households/{householdId}";
const errors = {
  401: { description: "Authentication required" },
  403: { description: "Household membership required" },
  422: { description: "Validation failed (error.issues lists the problems)" },
};

export function registerCookPaths(registry: OpenAPIRegistry, security: Security): void {
  const CookRecipe = registry.register("CookRecipe", cookRecipeInput);
  const tags = ["Cooking"];

  registry.registerPath({
    method: "post",
    path: `${base}/recipes/{recipeId}/cook`,
    summary:
      "Cook a recipe now: removes its ingredients from the pantry (soonest-expiring first). No meal plan needed. Send {} for 'cooked as written'. Pass planId + entryId to also mark a plan entry cooked.",
    tags, security,
    request: {
      params: HouseholdParams.extend({ recipeId: cookRecipeParams.shape.recipeId }),
      body: { required: false, content: { "application/json": { schema: CookRecipe } } },
    },
    responses: {
      201: { description: "Cooked. cookLog.consumed lists what came out of the pantry; cookLog.shortfalls lists what wasn't there (the cook still succeeds)." },
      404: { description: "Recipe, plan or plan entry not found" },
      409: { description: "That plan entry is already marked cooked" },
      ...errors,
    },
  });
  registry.registerPath({
    method: "get", path: `${base}/cooks`, summary: "What the household cooked, newest first", tags, security,
    request: { params: HouseholdParams, query: listCookLogQuery },
    responses: { 200: { description: "Paged cook history. Undone cooks are included, marked by undoneAt." }, ...errors },
  });
  registry.registerPath({
    method: "post", path: `${base}/cooks/{cookId}/undo`, summary: "Undo a cook: puts the ingredients back in the pantry and un-marks the plan entry", tags, security,
    request: { params: HouseholdParams.extend({ cookId: cookParams.shape.cookId }) },
    responses: {
      200: { description: "The cook, now with undoneAt set" },
      404: { description: "Cook not found" },
      409: { description: "Already undone" },
      ...errors,
    },
  });
}
