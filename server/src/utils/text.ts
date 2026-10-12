/** Escape a user-typed string so it can be used literally inside a RegExp (search boxes, etc.). */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Canonical form used for matching names: lowercase, accents removed, spaces collapsed.
 * "  Jalapeño  Pepper " -> "jalapeno pepper". This is what Ingredient.normalizedName and
 * Ingredient.aliases store, so lookups and duplicate checks compare like with like.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
