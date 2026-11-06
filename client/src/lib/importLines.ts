import { defaultUnitFor, type Prefs } from "./convert";
import type { ImportIngredient, ImportLine, ImportPreview, Unit } from "./types";

export interface PickedLike {
  id: string;
  name: string;
  baseUnitType?: ImportIngredient["baseUnitType"];
  gramsPerMl?: number | null | undefined;
}

export type HintKind = "missing" | "unit" | "amount" | "check";

/** A note shown on an imported line that the person should look at before saving. */
export interface LineHint {
  kind: HintKind;
  text: string;
  suggestions: PickedLike[];
}

export interface FormLine {
  ingredient: PickedLike | null;
  quantity: string;
  unit: Unit;
  optional: boolean;
  extra: Record<string, unknown>;
  /** the ingredient as the recipe wrote it, used to start the search */
  searchHint: string;
  /** what the recipe said, shown so nothing is lost in translation */
  from: string;
  hint?: LineHint;
}

export const picked = (i: ImportIngredient): PickedLike => ({ id: i._id, name: i.name, baseUnitType: i.baseUnitType, gramsPerMl: i.gramsPerMl });

function qtyText(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

export function toFormLine(l: ImportLine, prefs: Prefs): FormLine {
  const ingredient = l.match ? picked(l.match.ingredient) : null;
  const unit: Unit = l.unit ?? defaultUnitFor(ingredient ?? undefined, prefs);
  const extra: Record<string, unknown> = { originalText: l.originalText.slice(0, 300) };
  if (l.notes) extra["notes"] = l.notes.slice(0, 300);

  let hint: LineHint | undefined;
  if (!l.match) {
    hint = {
      kind: "missing",
      text: l.suggestions.length > 0 ? "Not sure which ingredient this is. Pick one, or search for it." : "No matching ingredient yet. Search for it, or add it as a new one.",
      suggestions: l.suggestions.map(picked),
    };
  } else if (!l.match.unitFits) {
    hint = { kind: "unit", text: "This unit can't be converted for that ingredient. Pick a different unit, or give the ingredient a weight.", suggestions: [] };
  } else if (l.quantity === null) {
    hint = { kind: "amount", text: "The recipe gives no amount here. Enter one, or remove the line.", suggestions: [] };
  } else if (l.match.confidence === "close") {
    hint = { kind: "check", text: `Matched to ${l.match.ingredient.name}. Check that's right.`, suggestions: l.suggestions.map(picked) };
  }

  return {
    ingredient,
    quantity: l.quantity === null ? "" : qtyText(l.quantity),
    unit,
    optional: l.optional,
    extra,
    searchHint: l.name,
    from: l.originalText,
    ...(hint ? { hint } : {}),
  };
}

export function previewToFormLines(p: ImportPreview, prefs: Prefs): FormLine[] {
  return p.lines.map((l) => toFormLine(l, prefs));
}

/** How many lines still need the person's attention. */
export function needsAttention(lines: readonly { hint?: LineHint | undefined }[]): number {
  return lines.filter((l) => l.hint && l.hint.kind !== "check").length;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
