import { z } from "zod";

export const addPantryItemSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient ID is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  expirationDate: z.string().optional(),
});

export const updatePantryItemSchema = z.object({
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  expirationDate: z.string().optional(),
});