import { normalizeName } from "../utils/text.js";
import type { SeedIngredient } from "./globalIngredients.js";

export interface SeedOp {
  updateOne: {
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
    upsert: true;
  };
}

/** The Ingredient document for one catalog entry, in the shape the model stores. */
export function toDocument(item: SeedIngredient) {
  const normalizedName = normalizeName(item.name);
  return {
    name: item.name,
    normalizedName,
    aliases: [...new Set((item.aliases ?? []).map(normalizeName))].filter((a) => a && a !== normalizedName),
    category: item.category,
    baseUnitType: item.baseUnitType,
    defaultUnit: item.defaultUnit,
    isStaple: item.isStaple === true,
    // Optional numbers are left out entirely rather than written as undefined.
    ...(item.gramsPerMl !== undefined ? { gramsPerMl: item.gramsPerMl } : {}),
    ...(item.gramsPerPiece !== undefined ? { gramsPerPiece: item.gramsPerPiece } : {}),
  };
}

/**
 * One upsert per catalog entry, matched on the shared catalog's normalizedName (shared entries
 * have no householdId), so re-running the seed never creates duplicates.
 *
 * Default: insert only. Existing entries are left alone, so densities someone corrected by hand
 * survive. With `update: true` the catalog values overwrite what is stored.
 */
export function buildSeedOps(items: readonly SeedIngredient[], opts: { update?: boolean } = {}): SeedOp[] {
  return items.map((item) => {
    const doc = toDocument(item);
    return {
      updateOne: {
        filter: { normalizedName: doc.normalizedName, householdId: { $exists: false } },
        update: opts.update ? { $set: doc } : { $setOnInsert: doc },
        upsert: true,
      },
    };
  });
}
