/**
 * Unit handling for Plantry.
 *
 * Every quantity is stored twice: as entered (quantity + unit, for display)
 * and as `baseQuantity`, expressed in the ingredient's base unit:
 *   mass   -> grams
 *   volume -> milliliters
 *   count  -> pieces
 *
 * All shopping-list math should use baseQuantity only.
 */

export type UnitType = "mass" | "volume" | "count";

export interface UnitDef {
  type: UnitType;
  /** How many base units (g, ml, or piece) are in one of this unit. */
  factor: number;
}

export const UNITS = {
  // mass (base: g)
  g: { type: "mass", factor: 1 },
  kg: { type: "mass", factor: 1000 },
  oz: { type: "mass", factor: 28.349523125 },
  lb: { type: "mass", factor: 453.59237 },
  // volume (base: ml)
  ml: { type: "volume", factor: 1 },
  l: { type: "volume", factor: 1000 },
  tsp: { type: "volume", factor: 4.92892159375 },
  tbsp: { type: "volume", factor: 14.78676478125 },
  fl_oz: { type: "volume", factor: 29.5735295625 },
  cup: { type: "volume", factor: 236.5882365 },
  pinch: { type: "volume", factor: 0.308 }, // ~1/16 tsp
  // count (base: piece)
  piece: { type: "count", factor: 1 },
} as const satisfies Record<string, UnitDef>;

export type Unit = keyof typeof UNITS;

/** Use this for the mongoose `enum` on every `unit` field. */
export const CANONICAL_UNITS = Object.keys(UNITS) as [Unit, ...Unit[]];

const SYNONYMS: Record<string, Unit> = {
  // mass
  gram: "g", grams: "g", gm: "g",
  kilogram: "kg", kilograms: "kg", kilo: "kg", kilos: "kg",
  ounce: "oz", ounces: "oz",
  pound: "lb", pounds: "lb", lbs: "lb",
  // volume
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  liter: "l", liters: "l", litre: "l", litres: "l",
  teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp", t: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp",
  cups: "cup", c: "cup",
  "fl oz": "fl_oz", floz: "fl_oz", "fluid ounce": "fl_oz", "fluid ounces": "fl_oz",
  pinches: "pinch",
  // count
  pc: "piece", pcs: "piece", pieces: "piece", each: "piece", ea: "piece",
  whole: "piece", clove: "piece", cloves: "piece", unit: "piece", units: "piece",
};

export class UnitConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitConversionError";
  }
}

/** The slice of Ingredient the conversion code needs. */
export interface ConvertibleIngredient {
  baseUnitType: UnitType;
  gramsPerMl?: number | null;
  gramsPerPiece?: number | null;
}

/**
 * Map user input ("Tbsp.", "tablespoons", " CUPS ") onto a canonical unit.
 * Returns null if the unit is not recognized.
 */
export function normalizeUnit(raw: string): Unit | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
  if (cleaned === "") return null;
  if (cleaned in UNITS) return cleaned as Unit;
  const viaSynonym = SYNONYMS[cleaned];
  if (viaSynonym) return viaSynonym;
  // "fl_oz" typed with a space or dash
  const underscored = cleaned.replace(/[ -]/g, "_");
  if (underscored in UNITS) return underscored as Unit;
  return null;
}

/** The unit `baseQuantity` is expressed in for this ingredient. */
export function baseUnitFor(ingredient: ConvertibleIngredient): Unit {
  switch (ingredient.baseUnitType) {
    case "mass":
      return "g";
    case "volume":
      return "ml";
    case "count":
      return "piece";
  }
}

function requirePositive(value: number | null | undefined, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new UnitConversionError(`Missing ${what}; cannot convert between unit types.`);
  }
  return value;
}

function toGrams(amount: number, from: UnitType, ing: ConvertibleIngredient): number {
  switch (from) {
    case "mass":
      return amount;
    case "volume":
      return amount * requirePositive(ing.gramsPerMl, "gramsPerMl");
    case "count":
      return amount * requirePositive(ing.gramsPerPiece, "gramsPerPiece");
  }
}

function fromGrams(grams: number, to: UnitType, ing: ConvertibleIngredient): number {
  switch (to) {
    case "mass":
      return grams;
    case "volume":
      return grams / requirePositive(ing.gramsPerMl, "gramsPerMl");
    case "count":
      return grams / requirePositive(ing.gramsPerPiece, "gramsPerPiece");
  }
}

function convertType(
  amount: number,
  from: UnitType,
  to: UnitType,
  ing: ConvertibleIngredient
): number {
  if (from === to) return amount;
  return fromGrams(toGrams(amount, from, ing), to, ing);
}

/** Round away floating-point noise without losing meaningful precision. */
function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/**
 * Convert a quantity as entered into the ingredient's base unit.
 *
 *   toBaseQuantity(2, "cup", flour)   // ml or g, depending on flour.baseUnitType
 *
 * Throws UnitConversionError for unknown units, negative / non-finite
 * quantities, or when a cross-type conversion lacks the needed density.
 */
export function toBaseQuantity(
  quantity: number,
  unit: string,
  ingredient: ConvertibleIngredient
): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new UnitConversionError(`Invalid quantity: ${quantity}`);
  }
  const canonical = normalizeUnit(unit);
  if (!canonical) {
    throw new UnitConversionError(`Unknown unit: "${unit}"`);
  }
  const def: UnitDef = UNITS[canonical];
  const inUnitTypeBase = quantity * def.factor; // g, ml, or piece
  return round(convertType(inUnitTypeBase, def.type, ingredient.baseUnitType, ingredient));
}

/**
 * Inverse of toBaseQuantity, for display: express a base amount in any unit.
 *
 *   fromBaseQuantity(500, "cup", milk)   // ~2.11
 */
export function fromBaseQuantity(
  baseQuantity: number,
  unit: string,
  ingredient: ConvertibleIngredient
): number {
  if (!Number.isFinite(baseQuantity) || baseQuantity < 0) {
    throw new UnitConversionError(`Invalid quantity: ${baseQuantity}`);
  }
  const canonical = normalizeUnit(unit);
  if (!canonical) {
    throw new UnitConversionError(`Unknown unit: "${unit}"`);
  }
  const def: UnitDef = UNITS[canonical];
  const inUnitTypeBase = convertType(baseQuantity, ingredient.baseUnitType, def.type, ingredient);
  return round(inUnitTypeBase / def.factor);
}