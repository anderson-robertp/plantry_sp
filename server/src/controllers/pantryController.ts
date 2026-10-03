import { Request, Response } from "express";
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
} from "../services/pantryService.js";

export async function getPantryController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.householdId) {
      res.status(400).json({
        message: "Household ID is required",
      });
      return;
    }

    const pantryItems = await getPantryItems(req.householdId);

    res.json(pantryItems);
  } catch (error) {
    console.error("Get pantry error:", error);

    res.status(500).json({
      message: "Failed to retrieve pantry",
    });
  }
}

export async function addPantryItemController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.householdId) {
      res.status(400).json({
        message: "Household ID is required",
      });
      return;
    }

    const {
      ingredientId,
      quantity,
      unit,
      expirationDate,
    } = req.body;

    if (
      !ingredientId ||
      quantity === undefined ||
      !unit
    ) {
      res.status(400).json({
        message: "ingredientId, quantity, and unit are required",
      });
      return;
    }

    const pantryItem = await addPantryItem(
      req.householdId,
      ingredientId,
      quantity,
      unit,
      expirationDate
        ? new Date(expirationDate)
        : undefined
    );

    res.status(201).json(pantryItem);
  } catch (error) {
    console.error("Add pantry item error:", error);

    res.status(500).json({
      message: "Failed to add pantry item",
    });
  }
}

export async function updatePantryItemController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.householdId) {
      res.status(400).json({
        message: "Household ID is required",
      });
      return;
    }

    const { pantryItemId } = req.params;

    if (typeof pantryItemId !== "string") {
      res.status(400).json({
        message: "Invalid pantry item ID",
      });
      return;
    }

    const {
      quantity,
      unit,
      expirationDate,
    } = req.body;

    if (
      quantity === undefined ||
      !unit
    ) {
      res.status(400).json({
        message: "quantity and unit are required",
      });
      return;
    }

    const pantryItem = await updatePantryItem(
      req.householdId,
      pantryItemId,
      quantity,
      unit,
      expirationDate
        ? new Date(expirationDate)
        : undefined
    );

    if (!pantryItem) {
      res.status(404).json({
        message: "Pantry item not found",
      });
      return;
    }

    res.json(pantryItem);
  } catch (error) {
    console.error("Update pantry item error:", error);

    res.status(500).json({
      message: "Failed to update pantry item",
    });
  }
}

export async function deletePantryItemController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.householdId) {
      res.status(400).json({
        message: "Household ID is required",
      });
      return;
    }

    const { pantryItemId } = req.params;

    if (typeof pantryItemId !== "string") {
      res.status(400).json({
        message: "Invalid pantry item ID",
      });
      return;
    }

    const pantryItem = await deletePantryItem(
      req.householdId,
      pantryItemId
    );

    if (!pantryItem) {
      res.status(404).json({
        message: "Pantry item not found",
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete pantry item error:", error);

    res.status(500).json({
      message: "Failed to delete pantry item",
    });
  }
}