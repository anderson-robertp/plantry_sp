import { normalizeName } from "./text.js";

export interface MatchCandidate {
  id: string;
  name: string;
  normalizedName: string;
  aliases: readonly string[];
  /** household ingredients win ties over shared ones */
  isHousehold: boolean;
}

export interface MatchResult {
  /** the best match when we are confident enough to pre-fill it */
  best: { id: string; confidence: "exact" | "close" } | null;
  /** other plausible ingredients for the person to choose from */
  suggestions: string[];
}

/** Preparation and freshness words that say how to treat an ingredient, not which one it is. */
const NOISE = new Set([
  "fresh", "freshly", "chopped", "diced", "minced", "sliced", "grated", "shredded", "crushed",
  "finely", "roughly", "coarsely", "thinly", "peeled", "pitted", "halved", "cubed", "softened",
  "melted", "packed", "sifted", "divided", "drained", "rinsed", "cooked", "uncooked", "raw", "whole",
  "boneless", "skinless", "organic", "good", "quality", "optional", "of", "the", "a", "an", "and/or",
  "extra", "plus", "more", "for", "serving", "garnish", "to", "taste",
]);

/** Cheap English singularising, only used to compare names, never shown. */
export function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/(ies)$/.test(word) && word.length > 4) return word.slice(0, -3) + "y"; // berries -> berry
  if (/(ves)$/.test(word)) return word.slice(0, -3) + "f"; // loaves -> loaf (close enough)
  if (/(oes)$/.test(word)) return word.slice(0, -2); // tomatoes -> tomato
  if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (/ss$/.test(word) || /us$/.test(word)) return word;
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

function words(s: string): string[] {
  return normalizeName(s)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Like core(), but keeps words such as "diced" so "diced tomatoes" can match an ingredient of that exact name. */
function strict(s: string): string {
  return words(s).map(singular).join(" ");
}

/** A name reduced to its comparable core: no noise words, singular nouns. */
export function core(s: string): string {
  return words(s)
    .filter((w) => !NOISE.has(w))
    .map(singular)
    .join(" ");
}

export function matchIngredient(rawName: string, candidates: readonly MatchCandidate[]): MatchResult {
  const target = core(rawName);
  if (target === "") return { best: null, suggestions: [] };

  const keyed = candidates.map((c) => ({
    c,
    keys: [c.normalizedName, ...c.aliases].map(core).filter(Boolean),
  }));

  // 0. the line is word for word a known name or alias
  const literal = strict(rawName);
  const same = candidates.filter((c) => [c.normalizedName, ...c.aliases].some((k) => strict(k) === literal));
  if (same.length > 0) {
    const pick = same.find((c) => c.isHousehold) ?? same[0]!;
    return { best: { id: pick.id, confidence: "exact" }, suggestions: [] };
  }

  // 1. the whole name (or an alias) is the same once noise and plurals are ignored
  const exact = keyed.filter((k) => k.keys.includes(target));
  if (exact.length > 0) {
    const pick = exact.find((k) => k.c.isHousehold) ?? exact[0]!;
    return { best: { id: pick.c.id, confidence: "exact" }, suggestions: [] };
  }

  // 2. every word of a known ingredient appears in the line ("kosher salt" -> "salt"), or the other
  //    way round ("pork and beans" line vs "beans"); the longest known name wins
  const targetWords = target.split(" ");
  const scored: { c: MatchCandidate; score: number }[] = [];
  for (const k of keyed) {
    let best = 0;
    for (const key of k.keys) {
      const kw = key.split(" ");
      // the last word is the thing itself ("kosher SALT", "chicken BROTH"); it has to agree
      if (kw[kw.length - 1] !== targetWords[targetWords.length - 1]) continue;
      const inLine = kw.every((w) => targetWords.includes(w));
      const lineIn = targetWords.every((w) => kw.includes(w));
      if (inLine) best = Math.max(best, 0.5 + 0.5 * (kw.length / targetWords.length));
      else if (lineIn) best = Math.max(best, 0.5 * (targetWords.length / kw.length));
    }
    if (best > 0) scored.push({ c: k.c, score: best });
  }
  scored.sort((a, b) => b.score - a.score || Number(b.c.isHousehold) - Number(a.c.isHousehold) || a.c.name.length - b.c.name.length);

  const top = scored[0];
  const second = scored[1];
  // only pre-fill when the winner is clearly ahead; otherwise let the person choose
  const confident = top !== undefined && top.score >= 0.5 && (second === undefined || top.score - second.score >= 0.2);
  return {
    best: confident && top ? { id: top.c.id, confidence: "close" } : null,
    suggestions: scored
      .filter((s) => !(confident && top && s.c.id === top.c.id))
      .slice(0, 3)
      .map((s) => s.c.id),
  };
}
