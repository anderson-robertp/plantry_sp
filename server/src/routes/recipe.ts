import { Router } from "express";
import {
  getRecipeController,
  listRecipesController,
  createRecipeController,
  updateRecipeController,
  deleteRecipeController,
  saveGlobalRecipeController,
} from "../controllers/recipe.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();

// List all recipes for a household
router.get(
  "/:householdId/recipes", 
  authenticate, 
  requireHouseholdMember, 
  listRecipesController,
  /*
  #swagger
  tags: ["Recipes"],
  description: "List all recipes for a household",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "A list of recipes",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Recipe"
            }
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

// Create, read, update, delete recipes for a household
router.post(
  "/:householdId/recipes", 
  authenticate, 
  requireHouseholdMember, 
  createRecipeController,
  /*
  #swagger
  tags: ["Recipes"],
  description: "Create a new recipe for a household",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    201: {
      description: "The created recipe",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Recipe"
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

// Get, update, delete a specific recipe for a household
router.get(
  "/:householdId/recipes/:recipeId", 
  authenticate, 
  requireHouseholdMember, 
  getRecipeController,
  /*
  #swagger
  tags: ["Recipes"],
  description: "Get a specific recipe for a household",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household",
      required: true,
      schema: {
        type: "string"
      }
    },
    {
      in: "path",
      name: "recipeId",
      description: "ID of the recipe to get",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "The requested recipe",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Recipe"
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

// Update and delete routes for a specific recipe
router.patch(
  "/:householdId/recipes/:recipeId", 
  authenticate, 
  requireHouseholdMember, 
  updateRecipeController,
  /*
  #swagger
  tags: ["Recipes"],
  description: "Update a specific recipe for a household",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household",
      required: true,
      schema: {
        type: "string"
      }
    },
    {
      in: "path",
      name: "recipeId",
      description: "ID of the recipe to update",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "The updated recipe",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Recipe"
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

// Delete a specific recipe for a household
router.delete(
  "/:householdId/recipes/:recipeId", 
  authenticate, 
  requireHouseholdMember, 
  deleteRecipeController,
  /*
  #swagger
  tags: ["Recipes"],
  description: "Delete a specific recipe for a household",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household",
      required: true,
      schema: {
        type: "string"
      }
    },
    {
      in: "path",
      name: "recipeId",
      description: "ID of the recipe to delete",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "The deleted recipe",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Recipe"
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

// copy a global catalog recipe into this household
router.post(
  "/:householdId/recipes/from-global/:globalRecipeId",
  authenticate,
  requireHouseholdMember,
  saveGlobalRecipeController,
  /*
  #swagger
  tags: ["Recipes"],
  description: "Copy a global catalog recipe into this household",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household",
      required: true,
      schema: {
        type: "string"
      }
    },
    {
      in: "path",
      name: "globalRecipeId",
      description: "ID of the global recipe to copy",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    201: {
      description: "The copied recipe",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Recipe"
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