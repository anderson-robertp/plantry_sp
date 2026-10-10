import { Router } from "express";
import { saveGlobalRecipeController } from "../controllers/recipe.js";
import {
  getGlobalRecipeController,
  listGlobalRecipesController,
} from "../controllers/globalRecipe.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();

// List all global recipes
router.get(
  "/", 
  authenticate, 
  listGlobalRecipesController,
  /*
  #swagger
  tags: ["Global Recipes"],
  description: "List all global recipes",
  responses: {
    200: {
      description: "A list of global recipes",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              $ref: "#/components/schemas/GlobalRecipe"
            }
          }
        }
      }
    }
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error"
          }
        }
      }
    }
  }
  */
);

// Get a specific global recipe by ID
router.get(
  "/:globalRecipeId", 
  authenticate, 
  getGlobalRecipeController,
  /*
  #swagger
  tags: ["Global Recipes"],
  description: "Get a specific global recipe by ID",
  parameters: [
    {
      in: "path",
      name: "globalRecipeId",
      description: "ID of the global recipe to retrieve",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "The requested global recipe",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/GlobalRecipe"
          }
        }
      }
    },
    404: {
      description: "Global recipe not found",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error"
          }
        }
      }
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error"
          }
        }
      }
    }
  }
  */
);

// Save a global recipe to a household's recipe collection
router.post(
  "/:householdId/recipes/from-global/:globalRecipeId",
  authenticate,
  requireHouseholdMember,
  saveGlobalRecipeController,
  /*
  #swagger
  tags: ["Global Recipes"],
  description: "Save a global recipe to a household's recipe collection",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household to save the recipe to",
      required: true,
      schema: {
        type: "string"
      }
    },
    {
      in: "path",
      name: "globalRecipeId",
      description: "ID of the global recipe to save",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "The saved recipe",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Recipe"
          }
        }
      }
    },
    404: {
      description: "Global recipe or household not found",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error"
          }
        }
      }
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Error"
          }
        }
      }
    }
  }
  */
);

export default router;