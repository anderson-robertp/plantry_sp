import { useEffect, useState } from "react";
import { api } from "../lib/client";
import type { Ingredient } from "../lib/types";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<void>>();

function fetchName(householdId: string, id: string): Promise<void> {
  const key = `${householdId}:${id}`;
  let p = inflight.get(key);
  if (!p) {
    p = api
      .get<Ingredient>(`/api/households/${householdId}/ingredients/${id}`)
      .then((ing) => {
        cache.set(key, ing.name);
      })
      .catch(() => {
        cache.set(key, "Unknown ingredient");
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, p);
  }
  return p;
}

/**
 * Names for ingredient ids, for places where the API sent only ids. Names load once and are
 * remembered for the session. `known` can seed names the API already populated.
 */
export function useIngredientNames(householdId: string, ids: readonly string[], known: Record<string, string> = {}) {
  const [, bump] = useState(0);
  const wanted = [...new Set(ids)].filter((id) => !known[id]);
  const missing = wanted.filter((id) => !cache.has(`${householdId}:${id}`));
  const signature = missing.join(",");

  useEffect(() => {
    if (missing.length === 0) return;
    let alive = true;
    Promise.all(missing.map((id) => fetchName(householdId, id))).then(() => {
      if (alive) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, signature]);

  return (id: string): string => known[id] ?? cache.get(`${householdId}:${id}`) ?? "…";
}

/** Call after creating an ingredient so its name shows right away. */
export function rememberIngredient(householdId: string, ing: Ingredient): void {
  cache.set(`${householdId}:${ing._id}`, ing.name);
}
