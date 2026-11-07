export interface FavoriteRow {
  userId: string;
  recipeId: string;
}

export interface FavoritesSummary {
  /** recipes this person has hearted */
  mine: string[];
  /** recipes hearted by anyone in the household, most-loved first */
  household: { recipeId: string; count: number }[];
}

/** Turns every favorite row in a household into one person's view plus the household tally. */
export function summarizeFavorites(rows: readonly FavoriteRow[], userId: string): FavoritesSummary {
  const mine = new Set<string>();
  const counts = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.userId === userId) mine.add(r.recipeId);
    const who = counts.get(r.recipeId) ?? new Set<string>();
    who.add(r.userId);
    counts.set(r.recipeId, who);
  }
  return {
    mine: [...mine].sort(),
    household: [...counts.entries()]
      .map(([recipeId, who]) => ({ recipeId, count: who.size }))
      .sort((a, b) => b.count - a.count || a.recipeId.localeCompare(b.recipeId)),
  };
}
