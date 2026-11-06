import { normalizeUnit, UNITS, type Unit } from "./units.js";

export interface ParsedLine {
  originalText: string;
  /** null when the line gives no amount ("salt, to taste"); the person fills it in. */
  quantity: number | null;
  /** null when the line has no usable unit; the client picks a default for the ingredient. */
  unit: Unit | null;
  /** What to look up in the ingredient list, e.g. "all-purpose flour". */
  name: string;
  notes?: string | undefined;
  optional: boolean;
  /** "can", "bag"… when the line counted packages and gave no weight, so a package size can fill in */
  countWord?: string | undefined;
}

const FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅐": 1 / 7, "⅑": 1 / 9, "⅒": 0.1,
  "⅓": 1 / 3, "⅔": 2 / 3, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

/** Words that stand for "one of them" rather than a measure. They stay out of the ingredient name. */
const COUNT_WORDS = new Set([
  "can", "cans", "jar", "jars", "package", "packages", "pkg", "packet", "packets", "bag", "bags",
  "box", "boxes", "bottle", "bottles", "bunch", "bunches", "head", "heads", "sprig", "sprigs",
  "slice", "slices", "stalk", "stalks", "carton", "cartons", "loaf", "loaves", "fillet", "fillets",
]);

const SIZE_WORDS = new Set(["large", "medium", "small", "big", "extra-large", "jumbo"]);

/** "cans" -> "can", "boxes" -> "box", "loaves" -> "loaf". */
function packageNoun(w: string): string {
  const x = w.toLowerCase();
  if (x === "loaves") return "loaf";
  if (/(ch|sh|x)es$/.test(x)) return x.slice(0, -2);
  return x.replace(/s$/, "");
}

function tidy(s: string): string {
  return s.replace(/\s+/g, " ").replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, "");
}

function number(token: string): number | null {
  const t = token.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^\d*[.,]\d+$/.test(t)) return Number(t.replace(",", "."));
  const frac = /^(\d+)\/(\d+)$/.exec(t);
  if (frac) {
    const d = Number(frac[2]);
    return d === 0 ? null : Number(frac[1]) / d;
  }
  return null;
}

/** Reads a leading amount: "1 1/2", "1½", "½", "2-3" (takes the first), "1.5". */
function leadingAmount(text: string): { value: number; rest: string } | null {
  // turn "1½" into "1 ½" and each vulgar fraction into a plain one
  const spaced = text.replace(/(\d)([¼½¾⅐-⅞])/g, "$1 $2");
  const m = /^(\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅐-⅞])(?:\s+(\d+\/\d+|[¼½¾⅐-⅞]))?/.exec(spaced);
  if (!m) return null;
  const first = m[1] ?? "";
  const second = m[2];
  const part = (t: string) => FRACTIONS[t] ?? number(t);
  const a = part(first);
  if (a === null) return null;
  let value = a;
  let consumed = m[0].length;
  if (second !== undefined) {
    const b = part(second);
    if (b !== null) value += b;
    else consumed = first.length;
  }
  let rest = spaced.slice(consumed);
  // "2-3 cups" or "2 to 3 cups": use the smaller number
  const range = /^\s*(?:-|–|—|to)\s*(\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅐-⅞])(?:\s+(\d+\/\d+|[¼½¾⅐-⅞]))?/.exec(rest);
  if (range) rest = rest.slice(range[0].length);
  return { value, rest: rest.trim() };
}

/** "14.5 oz", "400 g", "1 lb" -> a weight or volume (never a bare count). */
function measureOf(text: string): { value: number; unit: Unit } | null {
  const a = leadingAmount(text.trim());
  if (!a) return null;
  const unit = normalizeUnit(a.rest.replace(/\.$/, ""));
  if (!unit || UNITS[unit].type === "count") return null;
  return { value: a.value, unit };
}

export function parseIngredientLine(raw: string): ParsedLine {
  const originalText = tidy(raw.replace(/<[^>]*>/g, " "));
  let text = originalText;
  let optional = false;
  const notes: string[] = [];

  // parentheses: "(optional)", "(14 oz)", "(240 ml)"
  const parens: string[] = [];
  text = text.replace(/\(([^)]*)\)/g, (_all, inner: string) => {
    parens.push(inner.trim());
    return " ";
  });
  text = tidy(text);
  for (const p of parens) {
    if (/^optional$/i.test(p)) optional = true;
  }

  // ", to taste" and trailing preparation after a comma go to notes
  const comma = text.indexOf(",");
  let name = text;
  if (comma >= 0) {
    const tail = tidy(text.slice(comma + 1));
    name = text.slice(0, comma);
    if (/optional/i.test(tail)) optional = true;
    if (tail) notes.push(tail);
  }

  const amount = leadingAmount(name);
  let quantity: number | null = null;
  let rest = name;
  if (amount) {
    quantity = amount.value;
    rest = amount.rest;
  } else {
    const a = /^(an?|one)\s+/i.exec(rest);
    if (a) {
      quantity = 1;
      rest = rest.slice(a[0].length);
    }
  }

  let unit: Unit | null = null;
  let countWord: string | undefined;
  if (quantity !== null) {
    // size in parentheses before a count word: "2 (14 oz) cans tomatoes"
    const sized = parens.find((p) => /\d/.test(p));
    const words = rest.split(/\s+/);
    const w0 = (words[0] ?? "").replace(/[.,]$/, "");
    const w01 = `${w0} ${(words[1] ?? "").replace(/[.,]$/, "")}`;
    if (/^sticks?$/i.test(w0)) {
      // a US stick of butter is half a cup
      quantity = quantity * 0.5;
      unit = "cup";
      rest = words.slice(1).join(" ");
    } else if (normalizeUnit(w01) && words.length > 2) {
      unit = normalizeUnit(w01);
      rest = words.slice(2).join(" ");
    } else if (w0 && normalizeUnit(w0) && !(w0.toLowerCase() === "t" && words.length < 2) && words.length > 1) {
      const u = normalizeUnit(w0);
      // "c"/"t" are only units when something follows; a lone "pinch" of salt handled via words
      unit = u;
      rest = words.slice(1).join(" ");
    } else if (COUNT_WORDS.has(w0.toLowerCase())) {
      unit = "piece";
      rest = words.slice(1).join(" ");
      countWord = packageNoun(w0);
      const size = sized ? measureOf(sized) : null;
      if (size) {
        // "2 (14.5 oz) cans" is 29 oz; the weight on the label beats guessing
        quantity = quantity * size.value;
        unit = size.unit;
        notes.unshift(`${sized} ${countWord}`);
        countWord = undefined;
      } else if (sized) notes.unshift(`${sized} ${countWord}`);
    }
    rest = rest.replace(/^of\s+/i, "");
  } else if (/^(a\s+)?pinch(es)?\s+of\s+/i.test(rest)) {
    quantity = 1;
    unit = "pinch";
    rest = rest.replace(/^(a\s+)?pinch(es)?\s+of\s+/i, "");
  }

  // size adjectives ("2 large eggs") are noise for matching; keep them as a note
  const nameWords = tidy(rest).split(" ").filter(Boolean);
  const kept: string[] = [];
  for (const w of nameWords) {
    if (SIZE_WORDS.has(w.toLowerCase())) notes.push(w.toLowerCase());
    else kept.push(w);
  }
  name = kept.join(" ");
  if (unit === null && quantity !== null && !COUNT_WORDS.has((nameWords[0] ?? "").toLowerCase())) {
    // "2 eggs", "3 cloves garlic" -> counted things
    unit = "piece";
  }

  const parenNotes = parens.filter((p) => p && !/^optional$/i.test(p) && !notes.some((n) => n.startsWith(p)));
  const allNotes = [...notes, ...parenNotes.map((p) => `(${p})`)];

  return {
    originalText,
    quantity,
    unit,
    name: tidy(name),
    notes: allNotes.length ? allNotes.join(", ").slice(0, 300) : undefined,
    optional,
    countWord,
  };
}
