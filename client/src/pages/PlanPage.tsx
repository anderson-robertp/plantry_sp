import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useHousehold } from "../auth/HouseholdContext";
import { Badge, Button, Card, ErrorBanner, Field, inputCls, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useFavorites } from "../hooks/useFavorites";
import { usePrefs } from "../hooks/usePrefs";
import { planServings, scaleNote } from "../lib/servings";
import { api } from "../lib/client";
import { asList, courseFromTags, courseLabel, courseOf, courseRank, COURSES, dayLabel, eachDay, localToday, MEAL_SLOTS, refId } from "../lib/format";
import type { CookLog, CookResult, Course, Listed, MealPlan, MealPlanEntry, MealSlot, Recipe } from "../lib/types";

const slotOrder = (s: MealSlot) => MEAL_SLOTS.findIndex((x) => x.value === s);
const slotLabel = (s: MealSlot) => MEAL_SLOTS.find((x) => x.value === s)?.label ?? s;

export function PlanPage() {
  const { planId = "" } = useParams();
  const { household } = useHousehold();
  const navigate = useNavigate();
  const hh = `/api/households/${household._id}`;
  const planUrl = `${hh}/meal-plans/${planId}`;

  const plan = useAsync(() => api.get<MealPlan>(planUrl), [planUrl]);
  const recipes = useAsync(() => api.get<Listed<Recipe>>(`${hh}/recipes`, { limit: 100 }), [hh]);
  const cooks = useAsync(() => api.get<Listed<CookLog>>(`${hh}/cooks`, { limit: 100 }), [hh]);

  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<unknown>(null);

  const recipeList = asList(recipes.data);
  const nameOfRecipe = (id: string) => recipeList.find((r) => r._id === id)?.name ?? "Recipe";
  const cookByEntry = useMemo(() => {
    const m = new Map<string, CookLog>();
    for (const c of asList(cooks.data)) if (c.entryId && !c.undoneAt && !m.has(c.entryId)) m.set(c.entryId, c);
    return m;
  }, [cooks.data]);

  const refresh = () => {
    plan.reload();
    cooks.reload();
  };

  const act = async (fn: () => Promise<void>) => {
    setProblem(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setProblem(e);
    }
  };

  if (plan.loading && !plan.data) return <Loading />;
  if (plan.error) return <ErrorBanner error={plan.error} onRetry={plan.reload} />;
  const p = plan.data;
  if (!p) return null;

  const days = eachDay(p.startDate, p.endDate);
  const byDay = (d: string) =>
    p.entries
      .filter((e) => e.date === d)
      .sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot) || courseRank(courseOf(a)) - courseRank(courseOf(b)));
  /** One day's dishes grouped by meal (all the dinner dishes together, in serving order). */
  const bySlot = (d: string) => {
    const groups: { slot: MealSlot; entries: MealPlanEntry[] }[] = [];
    for (const e of byDay(d)) {
      const last = groups[groups.length - 1];
      if (last && last.slot === e.slot) last.entries.push(e);
      else groups.push({ slot: e.slot, entries: [e] });
    }
    return groups;
  };

  const cookRequest = (e: MealPlanEntry) =>
    api.post<CookResult>(`${hh}/recipes/${refId(e.recipeId)}/cook`, {
      planId: p._id,
      entryId: e._id,
      servings: e.servings,
      today: localToday(),
    });

  const shortText = (names: string[]) =>
    names.length > 0
      ? `Cooked. You were short on ${[...new Set(names)].join(", ")}; the pantry was used up as far as it went.`
      : "Cooked. The pantry has been updated.";

  const cook = (e: MealPlanEntry) =>
    act(async () => {
      const res = await cookRequest(e);
      setNotice(shortText((res.cookLog.shortfalls ?? []).map((x) => x.name)));
    });

  /** Cooks each dish in turn. If one fails, the ones before it stay cooked and the error is shown. */
  const cookAll = (list: MealPlanEntry[]) =>
    act(async () => {
      const short: string[] = [];
      for (const e of list) {
        const res = await cookRequest(e);
        short.push(...(res.cookLog.shortfalls ?? []).map((x) => x.name));
      }
      setNotice(shortText(short));
    });

  const setCourse = (e: MealPlanEntry, course: Course) =>
    act(async () => {
      await api.patch(`${planUrl}/entries/${e._id}`, { course });
    });

  return (
    <>
      <p className="mb-2 text-sm">
        <Link to="/plans" className="text-muted underline">
          All plans
        </Link>
      </p>
      <PageHeader
        title={p.name || "Untitled plan"}
        subtitle={`${dayLabel(p.startDate)} to ${dayLabel(p.endDate)}`}
        action={
          <div className="flex gap-2">
            <Link
              to={`/plans/${p._id}/shopping`}
              className="inline-flex items-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
            >
              Shopping list
            </Link>
            <DeletePlan
              onConfirm={async () => {
                await api.del(planUrl);
                navigate("/plans");
              }}
            />
          </div>
        }
      />

      {notice ? (
        <p role="status" className="mb-4 rounded-md bg-good-bg px-3 py-2 text-sm text-good">
          {notice}
        </p>
      ) : null}
      {problem ? (
        <div className="mb-4">
          <ErrorBanner error={problem} />
        </div>
      ) : null}

      <Card className="mb-6">
        <AddEntry
          recipes={recipeList}
          defaultDate={p.startDate > localToday() ? p.startDate : p.endDate < localToday() ? p.startDate : localToday()}
          onAdd={(body) =>
            act(async () => {
              await api.post(`${planUrl}/entries`, body);
            })
          }
        />
      </Card>

      <div className="grid gap-4">
        {days.map((d) => {
          const list = byDay(d);
          return (
            <section key={d} aria-label={dayLabel(d)}>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {dayLabel(d)} {d === localToday() ? <Badge tone="good">today</Badge> : null}
              </h2>
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-muted">Nothing planned.</p>
              ) : (
                <div className="grid gap-3">
                  {bySlot(d).map((g) => {
                    const todo = g.entries.filter((e) => !e.cookedAt);
                    return (
                      <div key={g.slot} className="rounded-xl border border-line bg-surface">
                        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                          <h3 className="text-sm font-medium">{slotLabel(g.slot)}</h3>
                          {todo.length > 1 ? (
                            <Button variant="secondary" onClick={() => cookAll(todo)}>
                              Cook all {todo.length}
                            </Button>
                          ) : null}
                        </div>
                        <ul className="divide-y divide-line">
                          {g.entries.map((e) => {
                            const done = Boolean(e.cookedAt);
                            const log = cookByEntry.get(e._id);
                            return (
                              <li key={e._id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {nameOfRecipe(refId(e.recipeId))} {done ? <Badge tone="good">cooked</Badge> : null}
                                  </p>
                                  <p className="flex items-center gap-2 text-sm text-muted">
                                    {done ? (
                                      courseLabel(courseOf(e))
                                    ) : (
                                      <select
                                        aria-label={`Course for ${nameOfRecipe(refId(e.recipeId))}`}
                                        className="rounded border border-line bg-surface px-1 py-0.5 text-xs text-ink"
                                        value={courseOf(e)}
                                        onChange={(ev) => setCourse(e, ev.target.value as Course)}
                                      >
                                        {COURSES.map((c) => (
                                          <option key={c.value} value={c.value}>
                                            {c.label}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    <span>&middot; serves {e.servings}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {done ? (
                                    log ? (
                                      <Button
                                        variant="secondary"
                                        onClick={() =>
                                          act(async () => {
                                            await api.post(`${hh}/cooks/${log._id}/undo`, {});
                                            setNotice("Undone. The ingredients are back in the pantry.");
                                          })
                                        }
                                      >
                                        Undo cook
                                      </Button>
                                    ) : null
                                  ) : (
                                    <Button onClick={() => cook(e)}>Cook</Button>
                                  )}
                                  {!done ? (
                                    <Button
                                      variant="ghost"
                                      aria-label="Remove from plan"
                                      onClick={() =>
                                        act(async () => {
                                          await api.del(`${planUrl}/entries/${e._id}`);
                                        })
                                      }
                                    >
                                      Remove
                                    </Button>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function DeletePlan({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirming)
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  return (
    <span className="flex items-center gap-1">
      <Button
        variant="danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } catch {
            setBusy(false);
          }
        }}
      >
        Delete plan
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  );
}

function AddEntry({
  recipes,
  defaultDate,
  onAdd,
}: {
  recipes: Recipe[];
  defaultDate: string;
  onAdd: (body: { date: string; slot: MealSlot; course: Course; recipeId: string; servings: number }) => Promise<void>;
}) {
  const [date, setDate] = useState(defaultDate);
  const [slot, setSlot] = useState<MealSlot>("dinner");
  const [recipeId, setRecipeId] = useState("");
  const [course, setCourse] = useState<Course>("main");
  const [servings, setServings] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const chosen = recipes.find((r) => r._id === recipeId);
  const { householdSize } = usePrefs();
  const favorites = useFavorites();
  const suggested = planServings(householdSize, chosen?.servings);
  const note = scaleNote(chosen?.servings, Number(servings) > 0 ? Number(servings) : suggested);
  // favorites first, then A to Z within each group
  const sorted = useMemo(
    () => [...recipes].sort((a, b) => Number(favorites.isFavorite(b._id)) - Number(favorites.isFavorite(a._id)) || a.name.localeCompare(b.name)),
    [recipes, favorites]
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const s = Number(servings || suggested || 0);
    const errs: Record<string, string> = {};
    if (!recipeId) errs.recipe = "Choose a recipe.";
    if (!Number.isFinite(s) || s <= 0) errs.servings = "Enter servings above zero.";
    setErr(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    await onAdd({ date, slot, course, recipeId, servings: s });
    setBusy(false);
    setRecipeId("");
    setCourse("main");
    setServings("");
  };

  if (recipes.length === 0) return <p className="text-sm text-muted">Add a recipe first, then you can plan meals with it.</p>;

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[8rem_7rem_7rem_1fr_6rem_auto] sm:items-end" noValidate>
      <Field label="Day" htmlFor="e-date">
        <input id="e-date" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Meal" htmlFor="e-slot">
        <select id="e-slot" className={inputCls} value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
          {MEAL_SLOTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Course" htmlFor="e-course">
        <select id="e-course" className={inputCls} value={course} onChange={(e) => setCourse(e.target.value as Course)}>
          {COURSES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Recipe" htmlFor="e-recipe" error={err.recipe}>
        <select id="e-recipe" className={inputCls} value={recipeId} onChange={(e) => {
            setRecipeId(e.target.value);
            // a recipe tagged "side" or "dessert" suggests its course
            setCourse(courseFromTags(recipes.find((r) => r._id === e.target.value)?.tags));
          }}>
          <option value="">Choose…</option>
          {sorted.map((r) => (
            <option key={r._id} value={r._id}>
              {favorites.isFavorite(r._id) ? "♥ " : ""}{r.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Servings"
        htmlFor="e-serv"
        error={err.servings}
        hint={note ?? (householdSize ? `Household of ${householdSize}` : undefined)}
      >
        <input
          id="e-serv"
          className={inputCls}
          inputMode="decimal"
          placeholder={suggested ? String(suggested) : ""}
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Adding…" : "Add meal"}
      </Button>
    </form>
  );
}

