import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { objectIdSchema } from "../validation/common.js";
import {
  createCustomItemInput,
  updateCustomItemInput,
  updateGeneratedItemInput,
} from "../validation/shoppingItem.js";

type Security = Record<string, string[]>[];
const base = "/api/households/{householdId}/meal-plans/{planId}/shopping-list";

export function registerShoppingItemPaths(registry: OpenAPIRegistry, security: Security): void {
  const tags = ["Shopping list"];
  const plan = z.object({ householdId: objectIdSchema, planId: objectIdSchema });
  const custom = plan.extend({ itemId: objectIdSchema });
  const generated = plan.extend({ ingredientId: objectIdSchema });
  const body = (schema: z.ZodTypeAny) => ({ content: { "application/json": { schema } } });
  const ok = { 200: { description: "The updated shopping list" }, 404: { description: "List or item not found" }, 422: { description: "Validation failed" } };

  registry.registerPath({
    method: "post", path: `${base}/custom-items`, tags, security,
    summary: "Add an item that isn't from a recipe",
    description: "Survives regenerating the list. Up to 200 added items per list.",
    request: { params: plan, body: body(registry.register("CreateCustomShoppingItem", createCustomItemInput)) },
    responses: { 201: { description: "The updated shopping list" }, 404: { description: "No list yet. Generate one first" }, 409: { description: "List is full (shopping_list_full)" }, 422: { description: "Validation failed" } },
  });
  registry.registerPath({
    method: "patch", path: `${base}/custom-items/{itemId}`, tags, security,
    summary: "Edit or check off an added item",
    description: "Send only what changes. null clears quantity (and unit) or the note.",
    request: { params: custom, body: body(registry.register("UpdateCustomShoppingItem", updateCustomItemInput)) },
    responses: ok,
  });
  registry.registerPath({
    method: "delete", path: `${base}/custom-items/{itemId}`, tags, security,
    summary: "Remove an added item", request: { params: custom }, responses: ok,
  });
  registry.registerPath({
    method: "patch", path: `${base}/items/{ingredientId}`, tags, security,
    summary: "Check off, re-quantity or annotate a generated item",
    description: "quantity and unit change what's shown to buy and last until the list is regenerated.",
    request: { params: generated, body: body(registry.register("UpdateGeneratedShoppingItem", updateGeneratedItemInput)) },
    responses: ok,
  });
  registry.registerPath({
    method: "delete", path: `${base}/items/{ingredientId}`, tags, security,
    summary: "Remove a generated item",
    description: "Comes back if the list is regenerated and the plan still needs it.",
    request: { params: generated }, responses: ok,
  });
}
