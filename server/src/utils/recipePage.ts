/**
 * Pulls a recipe out of a web page's schema.org JSON-LD, which nearly every recipe site publishes
 * for search engines. No scraping of page layout, so it keeps working when sites redesign.
 */

export interface PageRecipe {
  name: string;
  description?: string | undefined;
  servings: number;
  servingsGuessed: boolean;
  ingredientLines: string[];
  steps: string[];
  tags: string[];
  prepTimeMinutes?: number | undefined;
  cookTimeMinutes?: number | undefined;
  imageUrl?: string | undefined;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", frac12: "½", frac14: "¼", frac34: "¾" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (all, body: string) => {
    if (body[0] === "#") {
      const code = body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[body.toLowerCase()] ?? all;
  });
}

/** Plain text from a string that may contain tags and entities. */
export function plain(s: unknown): string {
  if (typeof s !== "string") return "";
  return decodeEntities(s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  return v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

function isRecipeNode(n: unknown): n is Json {
  if (!isObj(n)) return false;
  return asArray(n["@type"] as string | string[] | undefined).some((t) => typeof t === "string" && t.toLowerCase().endsWith("recipe"));
}

/** Walks a parsed JSON-LD value (object, array or @graph) looking for the first Recipe. */
function findRecipe(node: unknown, depth = 0): Json | null {
  if (depth > 6) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (!isObj(node)) return null;
  if (isRecipeNode(node)) return node;
  if (node["@graph"]) return findRecipe(node["@graph"], depth + 1);
  return null;
}

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = (m[1] ?? "").trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    try {
      out.push(JSON.parse(raw));
    } catch {
      // some sites ship slightly broken blocks; skip them and keep looking
    }
  }
  return out;
}

/** "PT1H30M" -> 90. Returns undefined for anything else. */
export function isoMinutes(v: unknown): number | undefined {
  if (typeof v !== "string") return undefined;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?$/i.exec(v.trim());
  if (!m) return undefined;
  const mins = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return mins > 0 && mins <= 100_000 ? mins : undefined;
}

function servingsOf(v: unknown): number | null {
  for (const item of asArray(v as unknown)) {
    const text = typeof item === "number" ? String(item) : typeof item === "string" ? item : "";
    const m = /\d+/.exec(text);
    if (m) {
      const n = Number(m[0]);
      if (n >= 1 && n <= 100) return n;
    }
  }
  return null;
}

function stepsOf(v: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  if (typeof v === "string") {
    // a single block of text: split on line breaks if it has them
    return decodeEntities(v.replace(/<br\s*\/?>|<\/p>|<\/li>/gi, "\n").replace(/<[^>]*>/g, " "))
      .split(/\n+/)
      .map((x) => x.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap((x) => stepsOf(x, depth + 1));
  if (isObj(v)) {
    if (v["itemListElement"]) return stepsOf(v["itemListElement"], depth + 1); // HowToSection
    const t = plain(v["text"]) || plain(v["name"]);
    return t ? [t] : [];
  }
  return [];
}

function tagsOf(r: Json): string[] {
  const raw = [...asArray(r["recipeCategory"] as unknown), ...asArray(r["recipeCuisine"] as unknown), ...asArray(r["keywords"] as unknown)];
  const parts = raw.flatMap((x) => (typeof x === "string" ? x.split(",") : []));
  const tags = parts.map((t) => plain(t).toLowerCase()).filter((t) => t.length > 0 && t.length <= 40);
  return [...new Set(tags)].slice(0, 8);
}

function imageOf(v: unknown): string | undefined {
  for (const item of asArray(v as unknown)) {
    const u = typeof item === "string" ? item : isObj(item) && typeof item["url"] === "string" ? item["url"] : undefined;
    if (u && /^https?:\/\//i.test(u)) return u;
  }
  return undefined;
}

export function extractRecipe(html: string): PageRecipe | null {
  let node: Json | null = null;
  for (const block of jsonLdBlocks(html)) {
    node = findRecipe(block);
    if (node) break;
  }
  if (!node) return null;

  const ingredientLines = asArray(node["recipeIngredient"] as unknown ?? node["ingredients"])
    .map((x) => plain(x))
    .filter(Boolean)
    .slice(0, 200);
  const name = plain(node["name"]);
  if (!name || ingredientLines.length === 0) return null;

  const servings = servingsOf(node["recipeYield"]);
  const description = plain(node["description"]).slice(0, 2000);

  return {
    name: name.slice(0, 200),
    description: description || undefined,
    servings: servings ?? 4,
    servingsGuessed: servings === null,
    ingredientLines,
    steps: stepsOf(node["recipeInstructions"]).map((s) => s.slice(0, 2000)).slice(0, 100),
    tags: tagsOf(node),
    prepTimeMinutes: isoMinutes(node["prepTime"]),
    cookTimeMinutes: isoMinutes(node["cookTime"]),
    imageUrl: imageOf(node["image"]),
  };
}
