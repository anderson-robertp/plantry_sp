import { Router } from "express";
import {
  getPantryController,
  addPantryItemController,
  updatePantryItemController,
  deletePantryItemController,
} from "../controllers/pantry.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";
import { validate } from "../middleware/validation.js";
import {
  createPantryItemInput as addPantryItemSchema,
  updatePantryItemInput as updatePantryItemSchema,
} from "../validation/pantry.js";

const router = Router();

// Get the pantry for a household
router.get(
  "/:householdId/pantry",
  authenticate,
  requireHouseholdMember,
  getPantryController,
  /*
  #swagger
  tags: ["Pantry"],
  description: "Get the pantry for a household",
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
      description: "The pantry for the household",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Pantry"
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

// Add a new pantry item to a household
router.post(
  "/:householdId/pantry",
  authenticate,
  requireHouseholdMember,
  //validate(addPantryItemSchema),
  addPantryItemController,
  /*
  #swagger
  tags: ["Pantry"],
  description: "Add a new pantry item to a household",
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
      description: "The created pantry item",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/PantryItem"
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

// Update an existing pantry item in a household
router.put(
  "/:householdId/pantry/:pantryItemId",
  authenticate,
  requireHouseholdMember,
  //validate(updatePantryItemSchema),
  updatePantryItemController,
  /*
  #swagger
  tags: ["Pantry"],
  description: "Update an existing pantry item in a household",
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
      name: "pantryItemId",
      description: "ID of the pantry item to update",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "The updated pantry item",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/PantryItem"
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

// Delete a pantry item from a household
router.delete(
  "/:householdId/pantry/:pantryItemId",
  authenticate,
  requireHouseholdMember,
  deletePantryItemController,
  /*
  #swagger
  tags: ["Pantry"],
  description: "Delete a pantry item from a household",
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
      name: "pantryItemId",
      description: "ID of the pantry item to delete",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "The deleted pantry item",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/PantryItem"
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