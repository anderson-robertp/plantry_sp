// src/utils/recommender.ts
// Pure recipe recommender. The service gathers facts; this ranks them. Anything that can rank
// candidates (a smarter model, the future R service) only has to satisfy `Recommender`.

export const COURSE_VALUES = ["main", "side", "appetizer", "dessert", "drink"] as const;
export type CourseValue = (typeof COURSE_VALUES)[number];

/** Best guess at a recipe's course from its tags; no tag means a main. */
export function courseFromTags(tags: readonly string[] | undefined): CourseValue {
  const t = new Set((tags ?? []).map((x) => x.toLowerCase()));
  for (const c of ["dessert", "side", "appetizer", "drink"] as const) if (t.has(c)) return c;
  return "main";
}

export interface Candidate {
  recipeId: string;
  name: string;
  course: CourseValue;
  /** Share of ingredients the pantry fully covers, 0 to 1. */
  coverage: number;
  canCook: boolean;
  missingCount: number;
  /** Names of ingredients in this recipe that expire soon. */
  expiringNames: string[];
  /** How many household members have hearted it. */
  lovedBy: number;
  /** Whole days since last cooked; null = never. */
  daysSinceCooked: number | null;
  /** Already on the plan being edited. */
  inPlan: boolean;
  /** prep + cook, when known. */
  totalMinutes: number | null;
}

export interface Context {
  /** Only recommend this course. */
  course?: CourseValue | undefined;
  /** Leave out recipes slower than this. */
  maxMinutes?: number | undefined;
}

export interface Reason {
  code: "can_cook" | "almost" | "expiring" | "favorite" | "not_recent" | "recent" | "in_plan" | "quick";
  text: string;
  /** Helps ("good") or hurts ("bad") the ranking; drives the colour on screen. */
  tone: "good" | "bad";
}

export interface Recommendation {
  recipeId: string;
  name: string;
  score: number;
  reasons: Reason[];
}

export interface Recommender {
  recommend(candidates: readonly Candidate[], ctx: Context): Recommendation[];
}

const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, 2).join(", ")} and ${xs.length - 2} more`);

function scoreOne(c: Candidate): Recommendation {
  const reasons: Reason[] = [];
  let score = 0;

  if (c.canCook) {
    score += 40;
    reasons.push({ code: "can_cook", text: "You have everything for it", tone: "good" });
  } else if (c.missingCount > 0 && c.missingCount <= 2) {
    reasons.push({ code: "almost", text: `Only ${c.missingCount} thing${c.missingCount === 1 ? "" : "s"} to buy`, tone: "good" });
  }
  score += Math.round(c.coverage * 30);
  score -= Math.min(15, c.missingCount * 3);

  if (c.expiringNames.length > 0) {
    score += Math.min(30, c.expiringNames.length * 12);
    reasons.push({ code: "expiring", text: `Uses ${list(c.expiringNames)} before ${c.expiringNames.length === 1 ? "it goes" : "they go"} off`, tone: "good" });
  }

  if (c.lovedBy > 0) {
    score += Math.min(25, 15 + (c.lovedBy - 1) * 5);
    reasons.push({ code: "favorite", text: c.lovedBy === 1 ? "A favorite" : `A favorite of ${c.lovedBy} people`, tone: "good" });
  }

  if (c.daysSinceCooked === null) {
    score += 5;
  } else if (c.daysSinceCooked < 7) {
    score -= 25;
    reasons.push({ code: "recent", text: c.daysSinceCooked === 0 ? "Cooked today" : `Cooked ${c.daysSinceCooked} day${c.daysSinceCooked === 1 ? "" : "s"} ago`, tone: "bad" });
  } else if (c.daysSinceCooked < 14) {
    score -= 10;
  } else if (c.daysSinceCooked >= 30) {
    score += 5;
    reasons.push({ code: "not_recent", text: "Not cooked in a while", tone: "good" });
  }

  if (c.totalMinutes !== null && c.totalMinutes > 0 && c.totalMinutes <= 30) {
    score += 3;
    reasons.push({ code: "quick", text: `Ready in ${c.totalMinutes} minutes`, tone: "good" });
  }

  if (c.inPlan) {
    score -= 50;
    reasons.push({ code: "in_plan", text: "Already in this plan", tone: "bad" });
  }
  return { recipeId: c.recipeId, name: c.name, score, reasons };
}

/** Rules first: transparent, no training data needed, and every score comes with its reasons. */
export const rulesRecommender: Recommender = {
  recommend(candidates, ctx) {
    return candidates
      .filter((c) => (ctx.course ? c.course === ctx.course : true))
      .filter((c) => (ctx.maxMinutes && c.totalMinutes !== null ? c.totalMinutes <= ctx.maxMinutes : true))
      .map(scoreOne)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  },
};
