import { Router, Request, Response, NextFunction } from "express";
import {
  createHouseholdController,
  getUserHouseholdsController,
} from "../controllers/household.js";
import { authenticate } from "../middleware/auth.js";
import { requireHouseholdMember } from "../middleware/householdAuth.js";

const router = Router();

// Create a new household
router.post(
  "/",
  authenticate, 
  createHouseholdController,
  /*
  #swagger
  tags: ["Households"],
  description: "Create a new household",
  responses: {
    201: {
      description: "The created household",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Household"
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

// Get households for the authenticated user
router.get(
  "/",
  authenticate,
  getUserHouseholdsController,
  /*
  #swagger
  tags: ["Households"],
  description: "Get households for the authenticated user",
  responses: {
    200: {
      description: "A list of households",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Household"
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

// Test household authorization
router.get(
  "/:householdId/test-auth",
  authenticate,
  requireHouseholdMember,
  (req: Request, res: Response) => {
    res.json({
      message: "Household authorization successful",
      householdId: req.householdId,
      role: req.householdRole,
      userId: req.userId,
    });
  },
  /*
  #swagger
  tags: ["Households"],
  description: "Test household authorization",
  parameters: [
    {
      in: "path",
      name: "householdId",
      description: "ID of the household to test authorization for",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "Household authorization successful",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Household"
          }
        }
      }
    },
    403: {
      description: "Access denied",
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