import { useEffect, useState } from "react";
import { api } from "../lib/client";
import type { Ingredient } from "../lib/types";

const cache = new Map<string, Ingredient | null>();
const inflight = new Map<string, Promise<void>>();

function fetchOne(householdId: string, id: string): Promise<void> {
  const key = `${householdId}:${id}`;
  let p = inflight.get(key);
  if (!p) {
    p = api
      .get<Ingredient>(`/api/households/${householdId}/ingredients/${id}`)
      .then((ing) => {
        cache.set(key, ing);
      })
      .catch(() => {
        cache.set(key, null); // not found or not allowed: show amounts as written
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, p);
  }
  return p;
}

/** Remember a freshly saved ingredient so every screen sees its new weights straight away. */
export function primeIngredientDetail(householdId: string, ing: Ingredient): void {
  cache.set(`${householdId}:${ing._id}`, ing);
}

/** Full ingredient records (weights and densities) for ids, loaded once and remembered. */
export function useIngredientDetails(householdId: string, ids: readonly string[]) {
  const [, bump] = useState(0);
  const missing = [...new Set(ids)].filter((id) => !cache.has(`${householdId}:${id}`));
  const signature = missing.join(",");

  useEffect(() => {
    if (missing.length === 0) return;
    let alive = true;
    Promise.all(missing.map((id) => fetchOne(householdId, id))).then(() => {
      if (alive) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, signature]);

  return (id: string): Ingredient | undefined => cache.get(`${householdId}:${id}`) ?? undefined;
}
