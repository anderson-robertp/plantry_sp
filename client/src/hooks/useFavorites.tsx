import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { api } from "../lib/client";

interface FavoritesValue {
  /** false when the server doesn't offer favorites (yet); hearts are hidden then */
  available: boolean;
  isFavorite: (recipeId: string) => boolean;
  /** how many people in the household have hearted it */
  lovedBy: (recipeId: string) => number;
  toggle: (recipeId: string) => Promise<void>;
}

const Ctx = createContext<FavoritesValue>({
  available: false,
  isFavorite: () => false,
  lovedBy: () => 0,
  toggle: async () => undefined,
});

interface Loaded {
  mine: string[];
  household: { recipeId: string; count: number }[];
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { household } = useHousehold();
  const [available, setAvailable] = useState(false);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let alive = true;
    setAvailable(false);
    api
      .get<Loaded>(`/api/households/${household._id}/favorites`)
      .then((r) => {
        if (!alive) return;
        setMine(new Set(r.mine));
        setCounts(new Map(r.household.map((h) => [h.recipeId, h.count])));
        setAvailable(true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [household._id]);

  const toggle = useCallback(
    async (recipeId: string) => {
      const wasOn = mine.has(recipeId);
      const bump = (by: number) =>
        setCounts((c) => {
          const n = new Map(c);
          n.set(recipeId, Math.max(0, (n.get(recipeId) ?? 0) + by));
          return n;
        });
      const flip = (on: boolean) =>
        setMine((m) => {
          const n = new Set(m);
          if (on) n.add(recipeId);
          else n.delete(recipeId);
          return n;
        });
      // show the change straight away, put it back if the server says no
      flip(!wasOn);
      bump(wasOn ? -1 : 1);
      try {
        const url = `/api/households/${household._id}/recipes/${recipeId}/favorite`;
        if (wasOn) await api.del(url);
        else await api.put(url, {});
      } catch {
        flip(wasOn);
        bump(wasOn ? 1 : -1);
      }
    },
    [household._id, mine]
  );

  const value = useMemo<FavoritesValue>(
    () => ({ available, isFavorite: (id) => mine.has(id), lovedBy: (id) => counts.get(id) ?? 0, toggle }),
    [available, mine, counts, toggle]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFavorites = () => useContext(Ctx);
