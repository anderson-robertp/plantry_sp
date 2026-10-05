import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine(
  (value) => mongoose.isValidObjectId(value),
  {
    message: "Invalid MongoDB ID",
  }
);

export const addPantryItemSchema = z.object({
  ingredientId: objectIdSchema,

  quantity: z
    .number()
    .positive("Quantity must be greater than 0"),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required"),

  expirationDate: z
    .iso.date()
    .optional(),
});

export const updatePantryItemSchema = z.object({
  quantity: z
    .number()
    .positive("Quantity must be greater than 0"),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required"),

  expirationDate: z
    .iso.date()
    .optional(),
});