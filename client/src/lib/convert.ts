import type { Unit } from "./types";

export type UnitSystem = "us" | "metric";
export type Measure = "weight" | "volume";
export interface Prefs {
  unitSystem: UnitSystem;
  measure: Measure;
}

/** What the converter needs to know about an ingredient. */
export interface Densities {
  baseUnitType?: "mass" | "volume" | "count" | undefined;
  /** Grams in one millilitre. Needed to go between weight and volume. */
  gramsPerMl?: number | null | undefined;
}

type Kind = "mass" | "volume" | "count";

// Same table as the server's utils/units.ts: how many grams, ml or pieces one unit is.
const UNIT: Record<Unit, { kind: Kind; factor: number }> = {
  g: { kind: "mass", factor: 1 },
  kg: { kind: "mass", factor: 1000 },
  oz: { kind: "mass", factor: 28.349523125 },
  lb: { kind: "mass", factor: 453.59237 },
  ml: { kind: "volume", factor: 1 },
  l: { kind: "volume", factor: 1000 },
  tsp: { kind: "volume", factor: 4.92892159375 },
  tbsp: { kind: "volume", factor: 14.78676478125 },
  fl_oz: { kind: "volume", factor: 29.5735295625 },
  cup: { kind: "volume", factor: 236.5882365 },
  pinch: { kind: "volume", factor: 0.308 },
  piece: { kind: "count", factor: 1 },
};

const US_UNITS = new Set<Unit>(["oz", "lb", "tsp", "tbsp", "fl_oz", "cup", "pinch"]);
const METRIC_UNITS = new Set<Unit>(["g", "kg", "ml", "l"]);
const SPOONS = new Set<Unit>(["tsp", "tbsp", "pinch"]);
/** Up to three tablespoons, a spoon is still the natural way to measure it, in any system. */
const SPOON_LIMIT_ML = 3 * UNIT.tbsp.factor + 0.01;

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

/** 1.5 -> "1 ½", 0.25 -> "¼", 2 -> "2". Falls back to a decimal for anything that isn't a known fraction. */
export function fractionText(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const rest = value - whole;
  if (rest < 1e-6) return String(whole);
  const hit = FRACTIONS.find(([f]) => Math.abs(f - rest) < 1e-3);
  if (!hit) return String(Math.round(value * 100) / 100);
  return whole > 0 ? `${whole} ${hit[1]}` : hit[1];
}

const decimalText = (n: number): string => String(Math.round(n * 100) / 100);

const nearest = (value: number, step: number): number => Math.round(value / step) * step;

/** The closest quarter or third; if that is more than 6% off, the closest eighth instead. */
function roundCups(value: number): number {
  const candidates: number[] = [];
  for (let k = 0; k <= Math.ceil(value * 4) + 1; k++) candidates.push(k / 4);
  for (let k = 0; k <= Math.ceil(value * 3) + 1; k++) candidates.push(k / 3);
  const best = candidates.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
  return Math.abs(best - value) / value <= 0.06 ? best : nearest(value, 1 / 8);
}

export interface Display {
  text: string;
  /** False when the amount is shown exactly as it was written. */
  converted: boolean;
}

const unchanged = (quantity: number, unit: Unit): Display => ({ text: asWritten(quantity, unit), converted: false });

const SHORT: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  oz: "oz",
  lb: "lb",
  ml: "ml",
  l: "l",
  tsp: "tsp",
  tbsp: "tbsp",
  fl_oz: "fl oz",
  cup: "cup",
  pinch: "pinch",
  piece: "",
};

/** How an amount reads when left alone: fractions for US units, decimals for metric. */
function asWritten(quantity: number, unit: Unit): string {
  const n = US_UNITS.has(unit) ? fractionText(quantity) : decimalText(quantity);
  if (unit === "piece") return n;
  const label = unit === "cup" && quantity > 1 ? "cups" : unit === "pinch" && quantity > 1 ? "pinches" : SHORT[unit];
  return `${n} ${label}`;
}

function massText(grams: number, system: UnitSystem): string {
  if (system === "metric") {
    if (grams >= 1000) return `${decimalText(nearest(grams / 1000, 0.05))} kg`;
    const g = grams < 20 ? Math.round(grams) : nearest(grams, 5);
    return `${g} g`;
  }
  const oz = grams / UNIT.oz.factor;
  if (oz >= 16) return `${fractionText(nearest(grams / UNIT.lb.factor, 0.25))} lb`;
  const rounded = oz < 4 ? nearest(oz, 0.25) : nearest(oz, 0.5);
  return `${fractionText(rounded === 0 ? 0.25 : rounded)} oz`;
}

function volumeText(ml: number, system: UnitSystem): string {
  if (system === "metric") {
    if (ml >= 1000) return `${decimalText(nearest(ml / 1000, 0.05))} l`;
    const v = ml < 20 ? Math.round(ml) : ml < 100 ? nearest(ml, 5) : nearest(ml, 10);
    return `${v} ml`;
  }
  if (ml < UNIT.tbsp.factor) {
    const tsp = Math.max(0.25, nearest(ml / UNIT.tsp.factor, 0.25));
    return `${fractionText(tsp)} tsp`;
  }
  if (ml < UNIT.cup.factor / 4) {
    return `${fractionText(Math.max(0.5, nearest(ml / UNIT.tbsp.factor, 0.5)))} tbsp`;
  }
  const cups = roundCups(ml / UNIT.cup.factor);
  return `${fractionText(cups)} ${cups > 1 ? "cups" : "cup"}`;
}

/**
 * A recipe line shown the way this person thinks about it.
 *
 * - Pieces ("2 eggs") are never touched.
 * - Weight or volume is chosen only for ingredients stored by weight (flour, sugar, rice) and
 *   only when their density is known; milk and oil stay volumes, spices stay spoons.
 * - Anything the converter can't do (no density, unknown unit) is shown exactly as written.
 * - Amounts already in the person's system are left as written.
 */
export function displayAmount(line: { quantity: number; unit: Unit }, ing: Densities | undefined, prefs: Prefs): Display {
  const { quantity, unit } = line;
  const def = UNIT[unit];
  if (!def || !Number.isFinite(quantity) || quantity <= 0 || def.kind === "count") return unchanged(quantity, unit);

  const base = quantity * def.factor; // grams for mass, ml for volume
  const density = ing?.gramsPerMl && ing.gramsPerMl > 0 ? ing.gramsPerMl : null;

  // a spoonful stays a spoonful
  if (def.kind === "volume" && SPOONS.has(unit) && base <= SPOON_LIMIT_ML) return unchanged(quantity, unit);

  const crossable = ing?.baseUnitType === "mass" && density !== null;
  const target: Kind = crossable ? (prefs.measure === "weight" ? "mass" : "volume") : def.kind;

  if (target === def.kind) {
    const inSystem = (prefs.unitSystem === "us" ? US_UNITS : METRIC_UNITS).has(unit);
    if (inSystem) return unchanged(quantity, unit);
    return { text: target === "mass" ? massText(base, prefs.unitSystem) : volumeText(base, prefs.unitSystem), converted: true };
  }

  // weight <-> volume, through the density
  if (target === "mass") return { text: massText(base * (density as number), prefs.unitSystem), converted: true };
  return { text: volumeText(base / (density as number), prefs.unitSystem), converted: true };
}

/** The unit a new ingredient line should start with, given how this person measures. */
export function defaultUnitFor(ing: Densities | undefined, prefs: Prefs): Unit {
  const type = ing?.baseUnitType ?? "mass";
  if (type === "count") return "piece";
  const density = ing?.gramsPerMl && ing.gramsPerMl > 0;
  if (type === "volume") return prefs.unitSystem === "us" ? "cup" : "ml";
  // stored by weight
  if (prefs.measure === "volume" && density) return prefs.unitSystem === "us" ? "cup" : "ml";
  return prefs.unitSystem === "us" ? "oz" : "g";
}

export const DEFAULT_PREFS: Prefs = { unitSystem: "us", measure: "volume" };
