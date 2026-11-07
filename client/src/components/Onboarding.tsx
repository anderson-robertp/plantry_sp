import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useHousehold } from "../auth/HouseholdContext";
import { usePrefs } from "../hooks/usePrefs";
import { messageOf } from "../lib/api";
import { api } from "../lib/client";
import type { Measure, UnitSystem } from "../lib/convert";
import { hasSeen, markSeen } from "../lib/seen";
import type { Member } from "../lib/types";
import { Choice } from "./ChoiceCards";
import { HouseholdSize } from "./HouseholdSize";
import { Button } from "./ui";

const KEY = "welcome";

const Ctx = createContext<{ start: () => void }>({ start: () => undefined });
export const useOnboarding = () => useContext(Ctx);

/** Wraps the signed-in app: shows the welcome tour once per person per device, and lets Settings replay it. */
export function OnboardingGate() {
  const { user } = useAuth();
  const { ready } = usePrefs();
  const userId = user?.id ?? "anon";
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  // decide once, after preferences have loaded, so the choices shown are the real ones
  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    if (!hasSeen(userId, KEY)) setOpen(true);
  }, [ready, userId]);

  const start = useCallback(() => setOpen(true), []);
  const finish = () => {
    markSeen(userId, KEY);
    setOpen(false);
  };

  return (
    <Ctx.Provider value={{ start }}>
      <Outlet />
      {open ? <Tour onDone={finish} /> : null}
    </Ctx.Provider>
  );
}

function Tour({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { household } = useHousehold();
  const { prefs, householdUnitSystem, householdSize, savePrefs, saveHouseholdUnitSystem, saveHouseholdSize } = usePrefs();
  const navigate = useNavigate();
  const [isOwner, setIsOwner] = useState(false);
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ items: Member[] }>(`/api/households/${household._id}/members`)
      .then((r) => alive && setIsOwner(r.items.find((m) => m.you)?.role === "owner"))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [household._id]);

  const steps = ["welcome", "units", "household", "start"];
  const current = steps[step] ?? "start";
  const last = step === steps.length - 1;

  useEffect(() => heading.current?.focus(), [step]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const save = async (fn: () => Promise<void>) => {
    setProblem(null);
    try {
      await fn();
    } catch (e) {
      setProblem(`Couldn't save that: ${messageOf(e)}. You can change it later in Settings.`);
    }
  };

  const go = (to: string) => {
    onDone();
    navigate(to);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="overflow-y-auto p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Step {step + 1} of {steps.length}
          </p>

          {current === "welcome" ? (
            <>
              <h2 id="tour-title" ref={heading} tabIndex={-1} className="mt-1 font-display text-2xl text-ink outline-none">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h2>
              <p className="mt-2 text-sm text-ink">Plantry connects four things, so dinner planning takes less thinking:</p>
              <ul className="mt-3 grid gap-2 text-sm text-ink">
                <li><strong>Pantry:</strong> what you have on hand.</li>
                <li><strong>Recipes:</strong> what you like to cook.</li>
                <li><strong>Meal plans:</strong> what you will cook this week.</li>
                <li><strong>Shopping list:</strong> only what is missing, worked out for you.</li>
              </ul>
              <p className="mt-3 text-sm text-muted">Two quick questions first, so amounts read the way you cook.</p>
            </>
          ) : null}

          {current === "units" ? (
            <>
              <h2 id="tour-title" ref={heading} tabIndex={-1} className="mt-1 font-display text-2xl text-ink outline-none">
                How do you measure?
              </h2>
              <div className="mt-3 grid gap-4">
                <Choice<UnitSystem>
                  name="Unit system"
                  value={prefs.unitSystem}
                  onChange={(unitSystem) => void save(() => savePrefs({ unitSystem }))}
                  options={[
                    { value: "us", label: "US", hint: "cups, ounces, pounds" },
                    { value: "metric", label: "Metric", hint: "millilitres, grams" },
                  ]}
                />
                <Choice<Measure>
                  name="Dry ingredients"
                  value={prefs.measure}
                  onChange={(measure) => void save(() => savePrefs({ measure }))}
                  options={[
                    { value: "volume", label: "By volume", hint: "flour and sugar in cups" },
                    { value: "weight", label: "By weight", hint: "flour and sugar in grams or ounces" },
                  ]}
                />
              </div>
              <p className="mt-3 text-sm text-muted">This is just for you. Everyone in the household picks their own.</p>
            </>
          ) : null}

          {current === "household" ? (
            <>
              <h2 id="tour-title" ref={heading} tabIndex={-1} className="mt-1 font-display text-2xl text-ink outline-none">
                Your household
              </h2>
              <p className="mt-2 text-sm text-ink">How many people usually eat together at {household.name}? New meal plan entries start with that many servings.</p>
              <div className="mt-3">
                <HouseholdSize value={householdSize} onSave={(n) => save(() => saveHouseholdSize(n))} />
              </div>
              {isOwner ? (
                <div className="mt-5">
                  <p className="text-sm text-ink">As owner, you also choose the units for the shared shopping list, so everyone reads the same one.</p>
                  <div className="mt-3">
                    <Choice<UnitSystem>
                      name="Shopping list units"
                      value={householdUnitSystem}
                      onChange={(unitSystem) => void save(() => saveHouseholdUnitSystem(unitSystem))}
                      options={[
                        { value: "us", label: "US", hint: "ounces, pounds, cups" },
                        { value: "metric", label: "Metric", hint: "grams, kilograms, litres" },
                      ]}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {current === "start" ? (
            <>
              <h2 id="tour-title" ref={heading} tabIndex={-1} className="mt-1 font-display text-2xl text-ink outline-none">
                Where to start
              </h2>
              <p className="mt-2 text-sm text-ink">Add a few things you have, or one recipe you cook often. Each page has a short guide to walk you through it.</p>
              <div className="mt-4 grid gap-2">
                <Button onClick={() => go("/pantry")}>Add pantry items</Button>
                <Button variant="secondary" onClick={() => go("/recipes")}>
                  Add a recipe
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted">You can replay this tour from Settings.</p>
            </>
          ) : null}

          {problem ? (
            <p role="alert" className="mt-3 text-sm text-bad">
              {problem}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line p-3">
          <Button variant="ghost" onClick={onDone}>
            {last ? "Close" : "Skip"}
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : null}
            {!last ? <Button onClick={() => setStep(step + 1)}>Next</Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
