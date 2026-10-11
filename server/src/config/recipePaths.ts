import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { objectIdSchema } from "../validation/common.js";
import { createRecipeInput, listRecipesQuery, recipeParams, updateRecipeInput } from "../validation/recipe.js";

type Security = Record<string, string[]>[];

const HouseholdParams = z.object({ householdId: objectIdSchema });
const HouseholdAndRecipeParams = HouseholdParams.extend({ recipeId: recipeParams.shape.recipeId });
const GlobalRecipeParams = HouseholdParams.extend({ globalRecipeId: objectIdSchema });

const base = "/api/households/{householdId}";
const errors = {
  401: { description: "Authentication required" },
  403: { description: "Household membership required" },
  422: { description: "Validation failed (error.issues lists the problems)" },
};

export function registerRecipePaths(registry: OpenAPIRegistry, security: Security): void {
  const CreateRecipe = registry.register("CreateRecipe", createRecipeInput);
  const UpdateRecipe = registry.register("UpdateRecipe", updateRecipeInput);
  const tags = ["Recipes"];

  registry.registerPath({
    method: "get", path: `${base}/recipes`, summary: "List household recipes", tags, security,
    request: { params: HouseholdParams, query: listRecipesQuery },
    responses: { 200: { description: "Paged recipes" }, ...errors },
  });
  registry.registerPath({
    method: "post", path: `${base}/recipes`, summary: "Create a recipe", tags, security,
    request: { params: HouseholdParams, body: { content: { "application/json": { schema: CreateRecipe } } } },
    responses: { 201: { description: "Recipe created" }, ...errors },
  });
  registry.registerPath({
    method: "get", path: `${base}/recipes/{recipeId}`, summary: "Get a recipe", tags, security,
    request: { params: HouseholdAndRecipeParams },
    responses: { 200: { description: "Recipe" }, 404: { description: "Recipe not found" }, ...errors },
  });
  registry.registerPath({
    method: "patch", path: `${base}/recipes/{recipeId}`, summary: "Update a recipe (partial; ingredients, if sent, replace the whole list)", tags, security,
    request: { params: HouseholdAndRecipeParams, body: { content: { "application/json": { schema: UpdateRecipe } } } },
    responses: { 200: { description: "Updated recipe" }, 404: { description: "Recipe not found" }, ...errors },
  });
  registry.registerPath({
    method: "delete", path: `${base}/recipes/{recipeId}`, summary: "Delete a recipe", tags, security,
    request: { params: HouseholdAndRecipeParams },
    responses: { 204: { description: "Deleted" }, 404: { description: "Recipe not found" }, ...errors },
  });
  registry.registerPath({
    method: "post", path: `${base}/recipes/from-global/{globalRecipeId}`, summary: "Copy a global catalog recipe into this household", tags, security,
    request: { params: GlobalRecipeParams },
    responses: { 201: { description: "Household copy created" }, 404: { description: "Global recipe not found" }, ...errors },
  });
}
