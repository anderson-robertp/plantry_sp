
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import {
  createPantryItemInput,
  updatePantryItemInput,
  pantryItemParams,
  listPantryQuery,
} from "../validation/pantry.js";

import { registerRecipePaths } from "./recipePaths.js";
import { registerMealPlanPaths } from "./mealPlanPaths.js";
import { registerAuthPaths } from "./authPaths.js";
import { registerIngredientPaths } from "./ingredientPaths.js";
import { registerHouseholdPaths } from "./householdPaths.js";
import { registerRecipeMatchPaths } from "./recipeMatchPaths.js";
import { objectIdSchema } from "../validation/common.js";
import { registerShoppingItemPaths } from "./shoppingItemPaths.js";
import { registerDashboardPaths } from "./dashboardPaths.js";
import { registerCookPaths } from "./cookPaths.js";
//import { registerMealPlanPaths } from "./mealPlanPaths.js";

export const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent(
  "securitySchemes",
  "bearerAuth",
  {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  }
);

const security = [{ [bearerAuth.name]: [] }];
registerAuthPaths(registry, security);
registerHouseholdPaths(registry, security);
registerDashboardPaths(registry, security);
registerIngredientPaths(registry, security);
registerRecipePaths(registry, security);
registerRecipeMatchPaths(registry, security);
registerMealPlanPaths(registry, security);
registerShoppingItemPaths(registry, security);
registerCookPaths(registry, security);

// Register reusable request schemas.
const CreatePantryItem = registry.register(
  "CreatePantryItem",
  createPantryItemInput
);

const UpdatePantryItem = registry.register(
  "UpdatePantryItem",
  updatePantryItemInput
);

const HouseholdParams = z.object({
  householdId: objectIdSchema,
});

const HouseholdAndPantryItemParams = z.object({
  householdId: objectIdSchema,
  pantryItemId: pantryItemParams.shape.pantryItemId,
});

// GET pantry items
registry.registerPath({
  method: "get",
  path: "/api/households/{householdId}/pantry",
  summary: "List household pantry items",
  tags: ["Pantry"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: HouseholdParams,
    query: listPantryQuery,
  },
  responses: {
    200: { description: "Pantry items retrieved successfully" },
    401: { description: "Authentication required" },
    403: { description: "Household membership required" },
  },
});

// POST pantry item
registry.registerPath({
  method: "post",
  path: "/api/households/{householdId}/pantry",
  summary: "Add a pantry item",
  tags: ["Pantry"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: HouseholdParams,
    body: {
      content: {
        "application/json": {
          schema: CreatePantryItem,
        },
      },
    },
  },
  responses: {
    201: { description: "Pantry item created successfully" },
    400: { description: "Invalid request" },
    401: { description: "Authentication required" },
    403: { description: "Household membership required" },
  },
});

// PUT pantry item
registry.registerPath({
  method: "put",
  path: "/api/households/{householdId}/pantry/{pantryItemId}",
  summary: "Update a pantry item",
  tags: ["Pantry"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: HouseholdAndPantryItemParams,
    body: {
      content: {
        "application/json": {
          schema: UpdatePantryItem,
        },
      },
    },
  },
  responses: {
    200: { description: "Pantry item updated successfully" },
    400: { description: "Invalid request" },
    401: { description: "Authentication required" },
    403: { description: "Household membership required" },
    404: { description: "Pantry item not found" },
  },
});

// DELETE pantry item
registry.registerPath({
  method: "delete",
  path: "/api/households/{householdId}/pantry/{pantryItemId}",
  summary: "Delete a pantry item",
  tags: ["Pantry"],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: HouseholdAndPantryItemParams,
  },
  responses: {
    204: { description: "Pantry item deleted successfully" },
    401: { description: "Authentication required" },
    403: { description: "Household membership required" },
    404: { description: "Pantry item not found" },
  },
});

export const openApiDocument =
  new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Plantry API",
      version: "1.0.0",
      description: "API documentation for Plantry",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
      {
        url: "https://plantry-sp.onrender.com:10000",
        description: "Production Server"
      }
    ],
  });
