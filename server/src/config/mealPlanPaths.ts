import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { objectIdSchema } from "../validation/common.js";
import {
  checkShoppingItemInput,
  createMealPlanInput,
  generateShoppingListInput,
  listMealPlansQuery,
  mealPlanParams,
  shoppingItemParams,
  updateMealPlanInput,
} from "../validation/mealPlan.js";

type Security = Record<string, string[]>[];

const HouseholdParams = z.object({ householdId: objectIdSchema });
const HouseholdAndPlanParams = HouseholdParams.extend({ planId: mealPlanParams.shape.planId });
const ShoppingItemParams = HouseholdParams.extend({
  planId: shoppingItemParams.shape.planId,
  ingredientId: shoppingItemParams.shape.ingredientId,
});

const base = "/api/households/{householdId}/meal-plans";
const errors = {
  401: { description: "Authentication required" },
  403: { description: "Household membership required" },
  422: { description: "Validation failed (error.issues lists the problems; also unknown_recipe / invalid_plan)" },
};

export function registerMealPlanPaths(registry: OpenAPIRegistry, security: Security): void {
  const CreateMealPlan = registry.register("CreateMealPlan", createMealPlanInput);
  const UpdateMealPlan = registry.register("UpdateMealPlan", updateMealPlanInput);
  const GenerateShoppingList = registry.register("GenerateShoppingList", generateShoppingListInput);
  const CheckShoppingItem = registry.register("CheckShoppingItem", checkShoppingItemInput);
  const tags = ["Meal plans"];
  const listTags = ["Shopping lists"];

  registry.registerPath({
    method: "get", path: base, summary: "List meal plans (optionally those overlapping from..to)", tags, security,
    request: { params: HouseholdParams, query: listMealPlansQuery },
    responses: { 200: { description: "Paged meal plans" }, ...errors },
  });
  registry.registerPath({
    method: "post", path: base, summary: "Create a meal plan", tags, security,
    request: { params: HouseholdParams, body: { content: { "application/json": { schema: CreateMealPlan } } } },
    responses: { 201: { description: "Meal plan created" }, ...errors },
  });
  registry.registerPath({
    method: "get", path: `${base}/{planId}`, summary: "Get a meal plan", tags, security,
    request: { params: HouseholdAndPlanParams },
    responses: { 200: { description: "Meal plan" }, 404: { description: "Plan not found" }, ...errors },
  });
  registry.registerPath({
    method: "patch", path: `${base}/{planId}`, summary: "Update a meal plan (partial; entries, if sent, replace the list)", tags, security,
    request: { params: HouseholdAndPlanParams, body: { content: { "application/json": { schema: UpdateMealPlan } } } },
    responses: { 200: { description: "Updated plan" }, 404: { description: "Plan not found" }, ...errors },
  });
  registry.registerPath({
    method: "delete", path: `${base}/{planId}`, summary: "Delete a meal plan and its shopping list", tags, security,
    request: { params: HouseholdAndPlanParams },
    responses: { 204: { description: "Deleted" }, 404: { description: "Plan not found" }, ...errors },
  });

  registry.registerPath({
    method: "post", path: `${base}/{planId}/shopping-list`, summary: "Generate (or regenerate) the shopping list; check marks are kept. Send {} for defaults.", tags: listTags, security,
    request: { params: HouseholdAndPlanParams, body: { required: false, content: { "application/json": { schema: GenerateShoppingList } } } },
    responses: { 200: { description: "Saved shopping list: items, covered, staples, warnings" }, 404: { description: "Plan not found" }, ...errors },
  });
  registry.registerPath({
    method: "get", path: `${base}/{planId}/shopping-list`, summary: "Get the saved shopping list", tags: listTags, security,
    request: { params: HouseholdAndPlanParams },
    responses: { 200: { description: "Shopping list" }, 404: { description: "No list yet for this plan" }, ...errors },
  });
  registry.registerPath({
    method: "patch", path: `${base}/{planId}/shopping-list/items/{ingredientId}`, summary: "Check or uncheck a list item", tags: listTags, security,
    request: { params: ShoppingItemParams, body: { content: { "application/json": { schema: CheckShoppingItem } } } },
    responses: { 200: { description: "Updated shopping list" }, 404: { description: "Item not on the list" }, ...errors },
  });
}
