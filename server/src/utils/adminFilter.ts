import { escapeRegExp, normalizeName } from "./text.js";

export interface AdminIngredientFilterInput {
  search?: string | undefined;
  category?: string | undefined;
  missing?: "package" | undefined;
}

/** The Mongo filter for the shared catalog: entries with no household, narrowed by the query. */
export function buildAdminIngredientFilter(q: AdminIngredientFilterInput): Record<string, unknown> {
  const filter: Record<string, unknown> = { householdId: null };
  if (q.search) {
    const needle = { $regex: escapeRegExp(normalizeName(q.search)) };
    filter.$or = [{ normalizedName: needle }, { aliases: needle }];
  }
  if (q.category) filter.category = q.category;
  if (q.missing === "package") filter.package = { $exists: false };
  return filter;
}
