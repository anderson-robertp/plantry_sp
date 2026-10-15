/**
 * Decides which pantry batches a cooked recipe uses up. Pure: no database, no clock.
 *
 * Order, per ingredient:
 *   1. batches that expire on or after `asOf`, soonest first (use what spoils first)
 *   2. batches with no expiry date
 *   3. batches already expired at `asOf`, as a last resort (you probably threw them out)
 * Ties go to the older batch. If the pantry doesn't hold enough, everything available is taken
 * and the gap is reported as a shortfall; cooking never fails because the count was off.
 */

export interface PantryBatch {
  id: string;
  ingredientId: string;
  /** Base units (g / ml / piece). */
  baseQuantity: number;
  expirationDate?: Date | null | undefined;
  createdAt?: Date | undefined;
}

export interface Need {
  ingredientId: string;
  baseQuantity: number;
}

export interface Take {
  batchId: string;
  ingredientId: string;
  /** Base units removed from this batch. Always > 0 and <= the batch's baseQuantity. */
  take: number;
}

export interface Shortfall {
  ingredientId: string;
  /** Base units that were needed but not in the pantry. */
  missing: number;
}

export interface Consumption {
  takes: Take[];
  shortfalls: Shortfall[];
}

const EPS = 1e-6;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4 + 0; // + 0 turns -0 into 0

function rank(batch: PantryBatch, asOf: Date | undefined): 0 | 1 | 2 {
  if (!batch.expirationDate) return 1;
  if (asOf && batch.expirationDate.getTime() < asOf.getTime()) return 2;
  return 0;
}

function compareBatches(a: PantryBatch, b: PantryBatch, asOf: Date | undefined): number {
  const ra = rank(a, asOf);
  const rb = rank(b, asOf);
  if (ra !== rb) return ra - rb;
  if (a.expirationDate && b.expirationDate) {
    const d = a.expirationDate.getTime() - b.expirationDate.getTime();
    if (d !== 0) return d;
  }
  const created = (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
  if (created !== 0) return created;
  return a.id.localeCompare(b.id);
}

export function planConsumption(
  needs: readonly Need[],
  batches: readonly PantryBatch[],
  opts: { asOf?: Date | undefined } = {}
): Consumption {
  const { asOf } = opts;

  // merge repeated ingredients, keeping first-seen order
  const wanted = new Map<string, number>();
  for (const need of needs) {
    if (!Number.isFinite(need.baseQuantity) || need.baseQuantity <= 0) continue;
    wanted.set(need.ingredientId, (wanted.get(need.ingredientId) ?? 0) + need.baseQuantity);
  }

  const byIngredient = new Map<string, PantryBatch[]>();
  for (const batch of batches) {
    if (!Number.isFinite(batch.baseQuantity) || batch.baseQuantity <= 0) continue;
    const list = byIngredient.get(batch.ingredientId) ?? [];
    list.push(batch);
    byIngredient.set(batch.ingredientId, list);
  }

  const takes: Take[] = [];
  const shortfalls: Shortfall[] = [];

  for (const [ingredientId, amount] of wanted) {
    let remaining = amount;
    const ordered = [...(byIngredient.get(ingredientId) ?? [])].sort((a, b) => compareBatches(a, b, asOf));

    for (const batch of ordered) {
      if (remaining <= EPS) break;
      const take = Math.min(remaining, batch.baseQuantity);
      takes.push({ batchId: batch.id, ingredientId, take: round4(take) });
      remaining -= take;
    }

    if (remaining > EPS) shortfalls.push({ ingredientId, missing: round4(remaining) });
  }

  return { takes: takes.filter((t) => t.take > 0), shortfalls };
}
