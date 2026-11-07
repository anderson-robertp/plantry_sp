import { fractionText } from "./convert";

/** How many servings a new plan entry starts with: the household's size if set, else what the recipe makes. */
export function planServings(householdSize: number | null | undefined, recipeServings: number | null | undefined): number | null {
  if (householdSize && householdSize > 0) return householdSize;
  if (recipeServings && recipeServings > 0) return recipeServings;
  return null;
}

/** "Recipe makes 4 · planning 2 (½×)", or null when there's nothing to say. */
export function scaleNote(recipeServings: number | undefined, planned: number | null): string | null {
  if (!recipeServings || !planned || recipeServings <= 0 || planned <= 0) return null;
  if (Math.abs(recipeServings - planned) < 1e-9) return null;
  const ratio = planned / recipeServings;
  return `Recipe makes ${recipeServings} · planning ${planned} (${fractionText(ratio)}×)`;
}
