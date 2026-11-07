import { ML_PER_CUP, unitKind } from "./convert";
import type { BaseUnitType, Unit } from "./types";

export type WeightField = "gramsPerMl" | "gramsPerPiece";

/** The parts of an ingredient that decide whether an amount can be converted. */
export interface WeightInfo {
  baseUnitType?: BaseUnitType | undefined;
  gramsPerMl?: number | null | undefined;
  gramsPerPiece?: number | null | undefined;
  package?: { size: number; unit: Unit } | null | undefined;
}

const has = (n: number | null | undefined): boolean => typeof n === "number" && Number.isFinite(n) && n > 0;

/**
 * Which weights an ingredient still needs before `unit` can be used with it. Mirrors the server:
 * mixing weight, volume and count goes through grams, and a count with no piece weight can mean one
 * whole package when the ingredient has one.
 */
export function missingWeights(ing: WeightInfo | null | undefined, unit: Unit): WeightField[] {
  if (!ing?.baseUnitType) return [];
  const from = unitKind(unit);
  const to = ing.baseUnitType;
  if (from === to) return [];
  if (from === "count" && !has(ing.gramsPerPiece) && ing.package && ing.package.size > 0 && unitKind(ing.package.unit) === to) return [];
  const need = new Set<WeightField>();
  for (const kind of [from, to]) {
    if (kind === "volume") need.add("gramsPerMl");
    if (kind === "count") need.add("gramsPerPiece");
  }
  return [...need].filter((f) => !has(ing[f]));
}

/** "1 cup weighs 120 g" -> grams per ml. */
export const gramsPerMlFromCup = (gramsPerCup: number): number => gramsPerCup / ML_PER_CUP;

/** Grams per ml -> a whole number of grams per cup, for showing. */
export const cupGrams = (gramsPerMl: number): number => Math.round(gramsPerMl * ML_PER_CUP);

/** Typical grams in one US cup, for common things. Offered as a starting point, never applied silently. */
const TYPICAL_CUP_GRAMS: { test: RegExp; grams: number }[] = [
  { test: /\bbrown sugar\b/, grams: 213 },
  { test: /\b(powdered|confectioners'?|icing) sugar\b/, grams: 120 },
  { test: /\bsugar\b/, grams: 200 },
  { test: /^((all[- ]purpose|plain|bread|cake|pastry|whole wheat) )?flour$/, grams: 120 },
  { test: /\bbutter\b/, grams: 227 },
  { test: /\bhoney\b/, grams: 340 },
  { test: /\b(rolled )?oats\b/, grams: 90 },
  { test: /\bcocoa\b/, grams: 85 },
  { test: /^(white |long[- ]grain |basmati |jasmine )?rice$/, grams: 185 },
  { test: /\b(milk|water)\b/, grams: 240 },
  { test: /\boil\b/, grams: 218 },
];

export function typicalCupGrams(name: string): number | null {
  const n = name.trim().toLowerCase();
  return TYPICAL_CUP_GRAMS.find((t) => t.test.test(n))?.grams ?? null;
}

/** Plain words for what is missing, for the prompt. */
export function describeNeed(fields: readonly WeightField[]): string {
  const cup = fields.includes("gramsPerMl");
  const piece = fields.includes("gramsPerPiece");
  if (cup && piece) return "how much 1 cup and how much one piece of it weighs";
  if (cup) return "how much 1 cup of it weighs";
  return "how much one piece of it weighs";
}
