import { normalizeName } from "../utils/text.js";
import type { PackageDef } from "../utils/packages.js";
import type { SeedIngredient } from "./globalIngredients.js";

/** A catalog entry, optionally with how it is sold. */
export type SeedItem = SeedIngredient & { package?: PackageDef | undefined };

export interface SeedOp {
  updateOne: {
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
    upsert: true;
  };
}

/** The Ingredient document for one catalog entry, in the shape the model stores. */
export function toDocument(item: SeedItem) {
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
    ...(item.package ? { package: { label: item.package.label, size: item.package.size, unit: item.package.unit } } : {}),
  };
}

/**
 * One upsert per catalog entry, matched on the shared catalog's normalizedName (shared entries
 * have no householdId), so re-running the seed never creates duplicates.
 *
 * Default: insert only. Existing entries are left alone, so densities someone corrected by hand
 * survive. With `update: true` the catalog values overwrite what is stored.
 */
export function buildSeedOps(items: readonly SeedItem[], opts: { update?: boolean } = {}): SeedOp[] {
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

export interface PackageOp {
  updateOne: {
    filter: Record<string, unknown>;
    update: { $set: { package: { label: string; size: number; unit: string } } };
  };
}

/**
 * Fills in package sizes on catalog entries that already exist, without touching anything else.
 * Entries that already have a package are skipped, so a size someone set by hand is never
 * overwritten. Nothing is created: an entry that isn't in the database is left to the main seed.
 */
export function buildPackageOps(items: readonly SeedItem[]): PackageOp[] {
  return items.flatMap((item) =>
    item.package
      ? [
          {
            updateOne: {
              filter: { normalizedName: normalizeName(item.name), householdId: { $exists: false }, package: { $exists: false } },
              update: { $set: { package: { label: item.package.label, size: item.package.size, unit: item.package.unit } } },
            },
          },
        ]
      : []
  );
}
