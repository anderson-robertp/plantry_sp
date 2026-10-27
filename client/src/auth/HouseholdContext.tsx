import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAsync } from "../hooks/useAsync";
import { asList } from "../lib/format";
import { api } from "../lib/client";
import { householdStore } from "../lib/token";
import type { Household, Listed, Membership } from "../lib/types";

interface HouseholdValue {
  /** The household everything on screen belongs to. */
  household: Household;
  households: Household[];
  select: (id: string) => void;
}

const HouseholdContext = createContext<HouseholdValue | null>(null);

function toHousehold(m: Membership): Household | null {
  const h = m.householdId;
  if (typeof h === "string") return { _id: h, name: "My household" };
  return h && h._id ? h : null;
}

/** Loads the user's households. Renders `empty` when they have none and `fallback` while loading. */
export function HouseholdProvider({
  children,
  fallback,
  empty,
  error,
}: {
  children: ReactNode;
  fallback: ReactNode;
  empty: (onCreated: () => void) => ReactNode;
  error: (e: unknown, retry: () => void) => ReactNode;
}) {
  const { data, loading, error: err, reload } = useAsync(() => api.get<Listed<Membership>>("/api/households"), []);
  const [chosen, setChosen] = useState<string | null>(() => householdStore.get());

  const households = useMemo(
    () => asList(data).map(toHousehold).filter((h): h is Household => h !== null),
    [data]
  );

  const select = useCallback((id: string) => {
    householdStore.set(id);
    setChosen(id);
  }, []);

  if (loading) return <>{fallback}</>;
  if (err) return <>{error(err, reload)}</>;
  if (households.length === 0) return <>{empty(reload)}</>;

  const household = households.find((h) => h._id === chosen) ?? households[0]!;
  return <HouseholdContext.Provider value={{ household, households, select }}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdValue {
  const v = useContext(HouseholdContext);
  if (!v) throw new Error("useHousehold must be used inside <HouseholdProvider>");
  return v;
}
