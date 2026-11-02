import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { IngredientPicker, type PickedIngredient } from "../components/IngredientPicker";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useIngredientNames } from "../hooks/useIngredientNames";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { amount, asList, refId, refName, UNITS } from "../lib/format";
import type { Listed, Recipe, Unit } from "../lib/types";

export function RecipesPage() {
  const { household } = useHousehold();
  const base = `/api/households/${household._id}/recipes`;
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsync(
    () => api.get<Listed<Recipe>>(base, { search: search.trim() || undefined, limit: 100 }),
    [base, search]
  );
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const all = useMemo(() => asList(data), [data]);
  const allTags = useMemo(() => [...new Set(all.flatMap((r) => r.tags ?? []))].sort(), [all]);
  const recipes = useMemo(() => (tag ? all.filter((r) => (r.tags ?? []).includes(tag)) : all), [all, tag]);

  return (
    <>
      <PageHeader
        title="Recipes"
        subtitle="What you like to cook, with exact amounts."
        action={!creating ? <Button onClick={() => setCreating(true)}>New recipe</Button> : null}
      />

      {creating ? (
        <Card className="mb-5">
          <RecipeForm
            householdId={household._id}
            onCancel={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              reload();
            }}
          />
        </Card>
      ) : null}

      <div className="mb-4">
        <label htmlFor="recipe-search" className="sr-only">
          Search recipes
        </label>
        <input
          id="recipe-search"
          className={inputCls}
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allTags.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          <TagChip active={tag === null} onClick={() => setTag(null)}>
            All
          </TagChip>
          {allTags.map((t) => (
            <TagChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
            </TagChip>
          ))}
        </div>
      ) : null}

      {loading && !data ? <Loading /> : null}
      {error ? <ErrorBanner error={error} onRetry={reload} /> : null}
      {!loading && !error && recipes.length === 0 ? (
        search || tag ? (
          <EmptyState title="No recipes match" body="Try a different word, or clear the search and tag filter." />
        ) : (
          <EmptyState
            title="No recipes yet"
            body="Add one you cook often. Once you have a few, Plantry can tell you which ones your pantry can make."
            action={<Button onClick={() => setCreating(true)}>Add your first recipe</Button>}
          />
        )
      ) : null}

      <ul className="grid gap-3">
        {recipes.map((r) => (
          <li key={r._id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="min-w-0 text-left" onClick={() => setOpen(open === r._id ? null : r._id)} aria-expanded={open === r._id}>
                <span className="block truncate font-medium">{r.name}</span>
                <span className="text-sm text-muted">
                  Serves {r.servings}
                </span>
              </button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" onClick={() => setOpen(open === r._id ? null : r._id)}>
                  {open === r._id ? "Hide" : "View"}
                </Button>
                <Button variant="ghost" onClick={() => { setOpen(null); setEditing(editing === r._id ? null : r._id); }}>
                  Edit
                </Button>
                <DeleteRecipe url={`${base}/${r._id}`} name={r.name} onDone={reload} />
              </div>
            </div>
            {(r.tags ?? []).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {(r.tags ?? []).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            ) : null}
            {editing === r._id ? (
              <div className="mt-3 border-t border-line pt-3">
                <EditRecipe
                  householdId={household._id}
                  url={`${base}/${r._id}`}
                  onCancel={() => setEditing(null)}
                  onSaved={() => {
                    setEditing(null);
                    reload();
                  }}
                />
              </div>
            ) : null}
            {open === r._id && editing !== r._id ? <RecipeDetails householdId={household._id} url={`${base}/${r._id}`} /> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function RecipeDetails({ householdId, url }: { householdId: string; url: string }) {
  const { data: recipe, error, loading, reload } = useAsync(() => api.get<Recipe>(url), [url]);
  const lines = recipe?.ingredients ?? [];
  const known = useMemo(() => {
    const k: Record<string, string> = {};
    for (const l of lines) {
      const n = refName(l.ingredientId);
      if (n) k[refId(l.ingredientId)] = n;
    }
    return k;
  }, [lines]);
  const nameOf = useIngredientNames(householdId, lines.map((l) => refId(l.ingredientId)), known);

  if (loading && !recipe) return <p className="mt-3 text-sm text-muted">Loading…</p>;
  if (error) return <div className="mt-3"><ErrorBanner error={error} onRetry={reload} /></div>;
  if (!recipe) return null;

  return (
    <div className="mt-3 grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Ingredients</h3>
        {lines.length === 0 ? (
          <p className="text-muted">No ingredients on this recipe.</p>
        ) : (
          <ul className="grid gap-1">
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {nameOf(refId(l.ingredientId))} {l.optional ? <Badge>optional</Badge> : null}
                </span>
                <span className="shrink-0 text-muted">{amount(l.quantity, l.unit)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {recipe.steps && recipe.steps.length > 0 ? (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Steps</h3>
          <ol className="grid list-decimal gap-1 pl-5">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/** Loads the full recipe and the ingredient names, then shows the form filled in. */
function EditRecipe({ householdId, url, onCancel, onSaved }: { householdId: string; url: string; onCancel: () => void; onSaved: () => void }) {
  const { data: recipe, error, loading, reload } = useAsync(() => api.get<Recipe>(url), [url]);
  const rawLines = recipe?.ingredients ?? [];
  const known = useMemo(() => {
    const k: Record<string, string> = {};
    for (const l of rawLines) {
      const n = refName(l.ingredientId);
      if (n) k[refId(l.ingredientId)] = n;
    }
    return k;
  }, [rawLines]);
  const nameOf = useIngredientNames(householdId, rawLines.map((l) => refId(l.ingredientId)), known);

  if (loading && !recipe) return <p className="mt-3 text-sm text-muted">Loading…</p>;
  if (error) return <div className="mt-3"><ErrorBanner error={error} onRetry={reload} /></div>;
  if (!recipe) return null;
  if (rawLines.some((l) => nameOf(refId(l.ingredientId)) === "…")) return <p className="mt-3 text-sm text-muted">Loading ingredients…</p>;

  const initialLines: Line[] = rawLines.map((l) => {
    const raw = l as unknown as Record<string, unknown>;
    const extra: Record<string, unknown> = {};
    for (const k of ["notes", "group", "originalText"]) if (typeof raw[k] === "string" && raw[k]) extra[k] = raw[k];
    const id = refId(l.ingredientId);
    return {
      key: ++lineKey,
      ingredient: { id, name: nameOf(id) },
      quantity: String(l.quantity),
      unit: l.unit,
      optional: Boolean(l.optional),
      extra,
    };
  });

  return <RecipeForm householdId={householdId} existing={recipe} initialLines={initialLines} onCancel={onCancel} onSaved={onSaved} />;
}

function DeleteRecipe({ url, name, onDone }: { url: string; name: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-2" role="group" aria-label={`Delete ${name}?`}>
      {problem ? <span className="text-xs text-bad">{messageOf(problem)}</span> : null}
      <Button
        variant="danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api.del(url);
            onDone();
          } catch (e) {
            setProblem(e);
            setBusy(false);
          }
        }}
      >
        {busy ? "Deleting…" : "Delete"}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  );
}

interface Line {
  key: number;
  ingredient: PickedIngredient | null;
  quantity: string;
  unit: Unit;
  optional: boolean;
  /** Fields this form doesn't edit (notes, group, original text) are kept as they were. */
  extra?: Record<string, unknown>;
}

const defaultUnitFor = (t?: string): Unit => (t === "count" ? "piece" : t === "volume" ? "ml" : "g");
let lineKey = 0;
const newLine = (): Line => ({ key: ++lineKey, ingredient: null, quantity: "", unit: "g", optional: false });

function RecipeForm({
  householdId,
  existing,
  initialLines,
  onCancel,
  onSaved,
}: {
  householdId: string;
  existing?: Recipe;
  initialLines?: Line[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [servings, setServings] = useState(existing ? String(existing.servings) : "2");
  const [steps, setSteps] = useState((existing?.steps ?? []).join("\n"));
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [lines, setLines] = useState<Line[]>(initialLines && initialLines.length > 0 ? initialLines : [newLine()]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);
  const [localError, setLocalError] = useState<Record<string, string>>({});

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const s = Number(servings);
    if (name.trim() === "") errs.name = "Give the recipe a name.";
    if (!Number.isInteger(s) || s < 1 || s > 100) errs.servings = "Enter a whole number of servings, 1 to 100.";
    const filled = lines.filter((l) => l.ingredient || l.quantity.trim() !== "");
    if (filled.length === 0) errs["ingredients"] = "Add at least one ingredient.";
    filled.forEach((l, i) => {
      if (!l.ingredient) errs[`line.${i}.ingredient`] = "Choose an ingredient.";
      const q = Number(l.quantity);
      if (l.quantity.trim() === "" || !Number.isFinite(q) || q < 0) errs[`line.${i}.quantity`] = "Enter an amount.";
    });
    setLocalError(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setProblem(null);
    const stepList = steps
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const tagList = [...new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
    const body = {
      name: name.trim(),
      servings: s,
      ...(existing ? { tags: tagList, steps: stepList } : { ...(tagList.length > 0 ? { tags: tagList } : {}), ...(stepList.length > 0 ? { steps: stepList } : {}) }),
      ingredients: filled.map((l) => ({
        ...(l.extra ?? {}),
        ingredientId: l.ingredient!.id,
        quantity: Number(l.quantity),
        unit: l.unit,
        ...(existing ? { optional: l.optional } : l.optional ? { optional: true } : {}),
      })),
    };
    try {
      if (existing) await api.patch(`/api/households/${householdId}/recipes/${existing._id}`, body);
      else await api.post(`/api/households/${householdId}/recipes`, body);
      onSaved();
    } catch (err) {
      setProblem(err);
      setBusy(false);
    }
  };

  const fe = { ...fieldErrors(problem), ...localError };
  const general = problem && Object.keys(fieldErrors(problem)).length === 0 ? messageOf(problem) : null;
  const filledIndex = (key: number) => lines.filter((l) => l.ingredient || l.quantity.trim() !== "").findIndex((l) => l.key === key);

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Recipe name" htmlFor="r-name" error={fe.name}>
          <input id="r-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Servings" htmlFor="r-serv" error={fe.servings}>
          <input id="r-serv" className={inputCls} inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
        </Field>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-xs font-medium text-muted">Ingredients (amounts for the servings above)</legend>
        {lines.map((l) => {
          const i = filledIndex(l.key);
          return (
            <div key={l.key} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-end">
              <IngredientPicker
                householdId={householdId}
                label="Ingredient"
                value={l.ingredient}
                onChange={(ing) => update(l.key, { ingredient: ing, ...(ing ? { unit: defaultUnitFor(ing.baseUnitType) } : {}) })}
                error={fe[`line.${i}.ingredient`] ?? fe[`ingredients.${i}.ingredientId`]}
              />
              <Field label="Amount" error={fe[`line.${i}.quantity`] ?? fe[`ingredients.${i}.quantity`]}>
                <input className={inputCls} inputMode="decimal" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
              </Field>
              <Field label="Unit" error={fe[`ingredients.${i}.unit`]}>
                <select className={inputCls} value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value as Unit })}>
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-center gap-2 pb-1.5">
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={l.optional} onChange={(e) => update(l.key, { optional: e.target.checked })} />
                  Optional
                </label>
                {lines.length > 1 ? (
                  <Button variant="ghost" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove this ingredient">
                    ✕
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
        {fe["ingredients"] ? (
          <p role="alert" className="text-xs text-bad">
            {fe["ingredients"]}
          </p>
        ) : null}
        <div>
          <Button variant="secondary" onClick={() => setLines((ls) => [...ls, newLine()])}>
            + Add ingredient
          </Button>
        </div>
      </fieldset>

      <Field label="Tags" htmlFor="r-tags" hint="Separate with commas: dinner, vegetarian, quick" error={fe.tags}>
        <input id="r-tags" className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} list="tag-suggestions" />
        <datalist id="tag-suggestions">
          {["breakfast", "lunch", "dinner", "side", "dessert", "snack", "vegetarian", "quick"].map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>

      <Field label="Steps" htmlFor="r-steps" hint="One step per line. Optional.">
        <textarea id="r-steps" rows={4} className={inputCls} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </Field>

      {general ? (
        <p role="alert" className="text-sm text-bad">
          {general}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : existing ? "Save changes" : "Save recipe"}
        </Button>
      </div>
    </form>
  );
}
