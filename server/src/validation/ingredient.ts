import { z } from "zod";
import { INGREDIENT_CATEGORIES } from "../utils/constants.js";
import { UNITS, type UnitType } from "../utils/units.js";
import { objectIdSchema, unitSchema } from "./common.js";

const BASE_UNIT_TYPES = ["mass", "volume", "count"] as const;

/**
 * baseUnitType, gramsPerMl and gramsPerPiece are set once, at creation. Recipes and pantry rows
 * store a baseQuantity computed from them, so changing them later would silently make every
 * stored quantity wrong. To fix a mistake: delete (if unused) and re-create.
 */
/** How it's sold ("can", 15 oz). Unlike the weights above it can be changed later: it only affects shopping. */
export const packageInput = z.object({
  label: z.string().trim().toLowerCase().min(1).max(30),
  size: z.number().positive().max(1_000_000),
  unit: unitSchema,
});

/** A package must use the same kind of unit as the ingredient (oz for something weighed). */
export const packageUnitProblem = (unit: keyof typeof UNITS, baseUnitType: UnitType): string | null =>
  UNITS[unit].type === baseUnitType ? null : `A package of this ingredient must be measured in ${baseUnitType} units`;

const ingredientBody = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(INGREDIENT_CATEGORIES).optional(), // the service stores "other" when omitted
  aliases: z.array(z.string().trim().min(1).max(120)).max(20).optional(), // other names: "scallion" for "green onion"
  defaultUnit: unitSchema.optional(),
  baseUnitType: z.enum(BASE_UNIT_TYPES),
  gramsPerMl: z.number().positive().max(100).optional(), // lets "1 cup flour" be compared with grams
  gramsPerPiece: z.number().positive().max(100_000).optional(), // lets "2 onions" be compared with grams
  isStaple: z.boolean().optional(),
  package: packageInput.optional(),
});

export const createIngredientInput = ingredientBody.superRefine((b, ctx) => {
  const problem = b.package ? packageUnitProblem(b.package.unit, b.baseUnitType) : null;
  if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["package", "unit"] });
});

/** PATCH: only the descriptive fields can change (see note above). `aliases`, if sent, replaces the list. */
export const updateIngredientInput = ingredientBody
  .pick({ name: true, category: true, aliases: true, defaultUnit: true, isStaple: true })
  // null removes the package. Its unit is checked against the ingredient's type in the service.
  .extend({ package: packageInput.nullable().optional() })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update",
  });

export const ingredientParams = z.object({ ingredientId: objectIdSchema });

/** GET /ingredients?search=flo&category=pantry&scope=household&page=1&limit=50 */
export const listIngredientsQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
  /** "all" (default): shared catalog + this household's own. */
  scope: z.enum(["all", "global", "household"]).default("all"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateIngredientInput = z.infer<typeof createIngredientInput>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientInput>;
export type ListIngredientsQuery = z.infer<typeof listIngredientsQuery>;
