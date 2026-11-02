import { UNITS, type Unit, type UnitType } from "./units.js";

/**
 * How an ingredient is sold: "can", 15 oz. One size per ingredient. Recipes still use measures
 * (grams, cups); packages only change how the shopping list is shown.
 */
export interface PackageDef {
  label: string;
  size: number;
  unit: Unit;
}

/** One package's size in the ingredient's base unit (g, ml or piece). */
export function packageSizeInBase(pkg: PackageDef): number {
  return pkg.size * UNITS[pkg.unit].factor;
}

/** A package must be measured in the same kind of unit as the ingredient (oz for a weighed item, not cups). */
export function packageFitsType(pkg: PackageDef, type: UnitType): boolean {
  return UNITS[pkg.unit].type === type;
}

export interface PackagesNeeded {
  /** Whole packages to buy, rounded up. */
  count: number;
  /** The unrounded number, to 2 decimals, so "uses about 2.4 cans" can be shown. */
  exact: number;
}

/** How many packages cover `baseQuantity`. Nothing needed means nothing to buy. */
export function packagesFor(baseQuantity: number, pkg: PackageDef): PackagesNeeded {
  if (!(baseQuantity > 0)) return { count: 0, exact: 0 };
  const exact = baseQuantity / packageSizeInBase(pkg);
  // 1e-9 stops 2.0000000001 packages (floating-point noise) from becoming 3
  return { count: Math.ceil(exact - 1e-9), exact: Math.round(exact * 100) / 100 };
}
