import { useMemo, useState, type FormEvent } from "react";
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
  const { data, error, loading, reload } = useAsync(
    () => api.get<Listed<Recipe>>(base, { search: search.trim() || undefined, limit: 100 }),
    [base, search]
  );
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const recipes = useMemo(() => asList(data), [data]);

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

      {loading && !data ? <Loading /> : null}
      {error ? <ErrorBanner error={error} onRetry={reload} /> : null}
      {!loading && !error && recipes.length === 0 ? (
        search ? (
          <EmptyState title="No recipes match" body="Try a different word, or clear the search." />
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
                  Serves {r.servings} &middot; {(r.ingredients ?? []).length} ingredient{(r.ingredients ?? []).length === 1 ? "" : "s"}
                </span>
              </button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" onClick={() => setOpen(open === r._id ? null : r._id)}>
                  {open === r._id ? "Hide" : "View"}
                </Button>
                <DeleteRecipe url={`${base}/${r._id}`} name={r.name} onDone={reload} />
              </div>
            </div>
            {open === r._id ? <RecipeDetails householdId={household._id} recipe={r} /> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function RecipeDetails({ householdId, recipe }: { householdId: string; recipe: Recipe }) {
  const known = useMemo(() => {
    const k: Record<string, string> = {};
    for (const l of recipe.ingredients ?? []) {
      const n = refName(l.ingredientId);
      if (n) k[refId(l.ingredientId)] = n;
    }
    return k;
  }, [recipe]);
  const nameOf = useIngredientNames(householdId, (recipe.ingredients ?? []).map((l) => refId(l.ingredientId)), known);

  return (
    <div className="mt-3 grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Ingredients</h3>
        <ul className="grid gap-1">
          {(recipe.ingredients ?? []).map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {nameOf(refId(l.ingredientId))} {l.optional ? <Badge>optional</Badge> : null}
              </span>
              <span className="shrink-0 text-muted">{amount(l.quantity, l.unit)}</span>
            </li>
          ))}
        </ul>
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
}

let lineKey = 0;
const newLine = (): Line => ({ key: ++lineKey, ingredient: null, quantity: "", unit: "g", optional: false });

function RecipeForm({ householdId, onCancel, onSaved }: { householdId: string; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState("2");
  const [steps, setSteps] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
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
    try {
      await api.post(`/api/households/${householdId}/recipes`, {
        name: name.trim(),
        servings: s,
        ...(stepList.length > 0 ? { steps: stepList } : {}),
        ingredients: filled.map((l) => ({
          ingredientId: l.ingredient!.id,
          quantity: Number(l.quantity),
          unit: l.unit,
          ...(l.optional ? { optional: true } : {}),
        })),
      });
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
                onChange={(ing) => update(l.key, { ingredient: ing })}
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
          {busy ? "Saving…" : "Save recipe"}
        </Button>
      </div>
    </form>
  );
}
