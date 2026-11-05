import { z } from "zod";
import { INGREDIENT_CATEGORIES } from "../utils/constants.js";

/**
 * GET /api/admin/ingredients?search=flo&category=baking&missing=package&page=1&limit=50
 * `missing=package` lists catalog entries that have no package size yet, for cleaning up.
 */
export const adminListIngredientsQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
  missing: z.enum(["package"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type AdminListIngredientsQuery = z.infer<typeof adminListIngredientsQuery>;
