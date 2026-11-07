import { matchIngredient, type MatchCandidate } from "../utils/ingredientMatch.js";
import { parseIngredientLine } from "../utils/ingredientLine.js";
import type { PageRecipe } from "../utils/recipePage.js";
import { toBaseQuantity, UNITS, type Unit } from "../utils/units.js";

export interface CatalogIngredient {
  _id: string;
  name: string;
  normalizedName: string;
  aliases: readonly string[];
  /** null for shared catalog ingredients */
  householdId: string | null;
  category?: string | undefined;
  baseUnitType: "mass" | "volume" | "count";
  gramsPerMl?: number | null | undefined;
  gramsPerPiece?: number | null | undefined;
  package?: { label: string; size: number; unit: Unit } | null | undefined;
}

export interface IngredientSummary {
  _id: string;
  name: string;
  category?: string | undefined;
  baseUnitType: "mass" | "volume" | "count";
  gramsPerMl?: number | null | undefined;
  gramsPerPiece?: number | null | undefined;
  package?: { label: string; size: number; unit: Unit } | null | undefined;
  /** true for the shared catalog, which households can't edit */
  shared: boolean;
}

export interface PreviewLine {
  originalText: string;
  quantity: number | null;
  unit: Unit | null;
  /** the ingredient name as the recipe wrote it, to pre-fill a search or a new ingredient */
  name: string;
  notes?: string | undefined;
  optional: boolean;
  match: { ingredient: IngredientSummary; confidence: "exact" | "close"; unitFits: boolean } | null;
  suggestions: IngredientSummary[];
}

export interface ImportPreview {
  sourceUrl: string;
  name: string;
  description?: string | undefined;
  servings: number;
  servingsGuessed: boolean;
  steps: string[];
  tags: string[];
  prepTimeMinutes?: number | undefined;
  cookTimeMinutes?: number | undefined;
  imageUrl?: string | undefined;
  lines: PreviewLine[];
}

const summary = (i: CatalogIngredient): IngredientSummary => ({
  _id: i._id,
  name: i.name,
  category: i.category,
  baseUnitType: i.baseUnitType,
  gramsPerMl: i.gramsPerMl,
  gramsPerPiece: i.gramsPerPiece,
  package: i.package,
  shared: i.householdId === null,
});

function fits(i: CatalogIngredient, quantity: number | null, unit: Unit | null): boolean {
  if (quantity === null || unit === null) return true; // nothing to check yet
  try {
    toBaseQuantity(quantity, unit, i);
    return true;
  } catch {
    return false;
  }
}

/** Turns a fetched recipe into what the review screen needs. Pure: no network, no database. */
export function buildPreview(page: PageRecipe, sourceUrl: string, ingredients: readonly CatalogIngredient[]): ImportPreview {
  const byId = new Map(ingredients.map((i) => [i._id, i]));
  const candidates: MatchCandidate[] = ingredients.map((i) => ({
    id: i._id,
    name: i.name,
    normalizedName: i.normalizedName,
    aliases: i.aliases,
    isHousehold: i.householdId !== null,
  }));

  const lines = page.ingredientLines.map((text): PreviewLine => {
    const parsed = parseIngredientLine(text);
    const result = matchIngredient(parsed.name, candidates);
    const ing = result.best ? byId.get(result.best.id) : undefined;

    let { quantity, unit } = parsed;
    // "1 can" of something the catalog knows how big a can is
    if (ing && parsed.countWord && quantity !== null && unit === "piece" && ing.package) {
      const pkg = ing.package;
      if (UNITS[pkg.unit].type === ing.baseUnitType && pkg.label.toLowerCase() === parsed.countWord) {
        quantity = Math.round(quantity * pkg.size * 1e4) / 1e4;
        unit = pkg.unit;
      }
    }

    return {
      originalText: parsed.originalText,
      quantity,
      unit,
      name: parsed.name,
      notes: parsed.notes,
      optional: parsed.optional,
      match: ing && result.best ? { ingredient: summary(ing), confidence: result.best.confidence, unitFits: fits(ing, quantity, unit) } : null,
      suggestions: result.suggestions.flatMap((id) => {
        const s = byId.get(id);
        return s ? [summary(s)] : [];
      }),
    };
  });

  return {
    sourceUrl,
    name: page.name,
    description: page.description,
    servings: page.servings,
    servingsGuessed: page.servingsGuessed,
    steps: page.steps,
    tags: page.tags,
    prepTimeMinutes: page.prepTimeMinutes,
    cookTimeMinutes: page.cookTimeMinutes,
    imageUrl: page.imageUrl,
    lines,
  };
}
