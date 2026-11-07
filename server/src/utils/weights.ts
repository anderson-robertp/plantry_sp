/**
 * Weights (grams per ml, grams per piece) can be added to an ingredient that doesn't have them, but
 * never changed once set: every saved recipe and pantry row stores a quantity worked out from them,
 * so changing one would quietly make those quantities wrong. Adding one is safe because a line that
 * needed it could never have been saved.
 */
export interface Weights {
  gramsPerMl?: number | null | undefined;
  gramsPerPiece?: number | null | undefined;
}

const has = (n: number | null | undefined): boolean => typeof n === "number" && Number.isFinite(n) && n > 0;

const LABEL = { gramsPerMl: "cup weight (grams per ml)", gramsPerPiece: "piece weight" } as const;

/** A message when `change` would overwrite a weight that is already set; otherwise null. */
export function weightChangeProblem(current: Weights, change: Weights): string | null {
  for (const field of ["gramsPerMl", "gramsPerPiece"] as const) {
    if (change[field] !== undefined && has(current[field])) {
      return `This ingredient already has a ${LABEL[field]}. It can't be changed, because amounts already saved were worked out from it.`;
    }
  }
  return null;
}
