import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { objectIdSchema } from "../validation/common.js";
import {
  checkShoppingItemInput,
  createMealPlanInput,
  generateShoppingListInput,
  mealPlanEntryInput,
  mealPlanEntryParams,
  updateMealPlanEntryInput,
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

const HouseholdPlanAndEntryParams = HouseholdParams.extend({
  planId: mealPlanEntryParams.shape.planId,
  entryId: mealPlanEntryParams.shape.entryId,
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
  const AddPlanEntry = registry.register("AddPlanEntry", mealPlanEntryInput);
  const UpdatePlanEntry = registry.register("UpdatePlanEntry", updateMealPlanEntryInput);
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
    method: "post", path: `${base}/{planId}/entries`, summary: "Add one meal. A date outside the plan stretches the plan to cover it (up to 62 days).", tags, security,
    request: { params: HouseholdAndPlanParams, body: { content: { "application/json": { schema: AddPlanEntry } } } },
    responses: { 201: { description: "The updated plan" }, 404: { description: "Plan not found" }, ...errors },
  });
  registry.registerPath({
    method: "patch", path: `${base}/{planId}/entries/{entryId}`, summary: "Change one meal: move it to another day or slot, swap the recipe, change the servings. A cooked meal can't be edited until the cook is undone.", tags, security,
    request: { params: HouseholdPlanAndEntryParams, body: { content: { "application/json": { schema: UpdatePlanEntry } } } },
    responses: { 200: { description: "The updated plan" }, 404: { description: "Plan or entry not found" }, 409: { description: "That meal was cooked (error.code entry_cooked)" }, ...errors },
  });
  registry.registerPath({
    method: "delete", path: `${base}/{planId}/entries/{entryId}`, summary: "Remove one meal (also fine for a cooked one; cook history is kept)", tags, security,
    request: { params: HouseholdPlanAndEntryParams },
    responses: { 204: { description: "Removed" }, 404: { description: "Plan or entry not found" }, ...errors },
  });

  registry.registerPath({
    method: "post", path: `${base}/{planId}/shopping-list`, summary: "Generate (or regenerate) the shopping list; check marks are kept. Cooked meals are left out. Send {} for defaults, or {\"fromDate\":\"YYYY-MM-DD\"} (today) to also ignore meals on earlier days.", tags: listTags, security,
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
