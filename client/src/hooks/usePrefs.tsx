import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { api } from "../lib/client";
import { DEFAULT_PREFS, type Prefs, type UnitSystem } from "../lib/convert";

interface PrefsValue {
  /** This person's display preferences. */
  prefs: Prefs;
  /** The household's unit system, used for shopping lists. */
  householdUnitSystem: UnitSystem;
  ready: boolean;
  savePrefs: (patch: Partial<Prefs>) => Promise<void>;
  saveHouseholdUnitSystem: (value: UnitSystem) => Promise<void>;
}

const Ctx = createContext<PrefsValue>({
  prefs: DEFAULT_PREFS,
  householdUnitSystem: "us",
  ready: false,
  savePrefs: async () => undefined,
  saveHouseholdUnitSystem: async () => undefined,
});

/**
 * Loads this person's preferences and their household's settings once. If either can't be loaded
 * (for example the server hasn't been updated yet), the defaults are used and the app still works.
 */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const { household } = useHousehold();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [householdUnitSystem, setHouseholdUnitSystem] = useState<UnitSystem>("us");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);
    Promise.allSettled([
      api.get<Prefs>("/api/me/preferences"),
      api.get<{ unitSystem: UnitSystem }>(`/api/households/${household._id}/settings`),
    ]).then(([p, h]) => {
      if (!alive) return;
      if (p.status === "fulfilled") setPrefs(p.value);
      if (h.status === "fulfilled") setHouseholdUnitSystem(h.value.unitSystem);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [household._id]);

  const savePrefs = useCallback(async (patch: Partial<Prefs>) => {
    setPrefs(await api.patch<Prefs>("/api/me/preferences", patch));
  }, []);

  const saveHouseholdUnitSystem = useCallback(
    async (unitSystem: UnitSystem) => {
      const res = await api.patch<{ unitSystem: UnitSystem }>(`/api/households/${household._id}/settings`, { unitSystem });
      setHouseholdUnitSystem(res.unitSystem);
    },
    [household._id]
  );

  const value = useMemo(
    () => ({ prefs, householdUnitSystem, ready, savePrefs, saveHouseholdUnitSystem }),
    [prefs, householdUnitSystem, ready, savePrefs, saveHouseholdUnitSystem]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);
