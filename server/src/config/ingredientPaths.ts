import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { objectIdSchema } from "../validation/common.js";
import {
  createIngredientInput,
  ingredientParams,
  listIngredientsQuery,
  updateIngredientInput,
} from "../validation/ingredient.js";

type Security = Record<string, string[]>[];

const HouseholdParams = z.object({ householdId: objectIdSchema });
const HouseholdAndIngredientParams = HouseholdParams.extend({ ingredientId: ingredientParams.shape.ingredientId });

const base = "/api/households/{householdId}/ingredients";
const errors = {
  401: { description: "Authentication required" },
  403: { description: "Household membership required (or: shared catalog ingredients are read-only)" },
  422: { description: "Validation failed (error.issues lists the problems)" },
};

export function registerIngredientPaths(registry: OpenAPIRegistry, security: Security): void {
  const CreateIngredient = registry.register("CreateIngredient", createIngredientInput);
  const UpdateIngredient = registry.register("UpdateIngredient", updateIngredientInput);
  const tags = ["Ingredients"];

  registry.registerPath({
    method: "get", path: base, summary: "List ingredients (shared catalog + this household's own)", tags, security,
    request: { params: HouseholdParams, query: listIngredientsQuery },
    responses: { 200: { description: "Paged ingredients" }, ...errors },
  });
  registry.registerPath({
    method: "post", path: base, summary: "Create a household ingredient (copy the returned _id into recipes and pantry; category defaults to other)", tags, security,
    request: { params: HouseholdParams, body: { content: { "application/json": { schema: CreateIngredient } } } },
    responses: { 201: { description: "Ingredient created" }, 409: { description: "An ingredient with that name already exists" }, ...errors },
  });
  registry.registerPath({
    method: "get", path: `${base}/{ingredientId}`, summary: "Get an ingredient", tags, security,
    request: { params: HouseholdAndIngredientParams },
    responses: { 200: { description: "Ingredient" }, 404: { description: "Ingredient not found" }, ...errors },
  });
  registry.registerPath({
    method: "patch", path: `${base}/{ingredientId}`, summary: "Update name, category, default unit or staple flag (units and densities are fixed once created)", tags, security,
    request: { params: HouseholdAndIngredientParams, body: { content: { "application/json": { schema: UpdateIngredient } } } },
    responses: { 200: { description: "Updated ingredient" }, 404: { description: "Ingredient not found" }, 409: { description: "Name already in use" }, ...errors },
  });
  registry.registerPath({
    method: "delete", path: `${base}/{ingredientId}`, summary: "Delete an unused household ingredient", tags, security,
    request: { params: HouseholdAndIngredientParams },
    responses: { 204: { description: "Deleted" }, 404: { description: "Ingredient not found" }, 409: { description: "Still used by a recipe or pantry item" }, ...errors },
  });
}
