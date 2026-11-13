import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { IngredientPicker, type PickedIngredient } from "../components/IngredientPicker";
import { FavoriteButton } from "../components/FavoriteButton";
import { Guide } from "../components/Guide";
import { RecipeImportStart } from "../components/RecipeImport";
import { WeightPrompt } from "../components/WeightPrompt";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useFavorites } from "../hooks/useFavorites";
import { useIngredientDetails } from "../hooks/useIngredientDetails";
import { useIngredientNames } from "../hooks/useIngredientNames";
import { usePrefs } from "../hooks/usePrefs";
import { defaultUnitFor, displayAmount } from "../lib/convert";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { amount, asList, refId, refName, UNITS } from "../lib/format";
import { hostOf, needsAttention, previewToFormLines, type LineHint } from "../lib/importLines";
import type { ImportPreview, Listed, Recipe, Unit } from "../lib/types";
import { missingWeights, type WeightInfo } from "../lib/weights";

export function RecipesPage() {
  const { household } = useHousehold();
  const base = `/api/households/${household._id}/recipes`;
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const favorites = useFavorites();
  const { data, error, loading, reload } = useAsync(
    () => api.get<Listed<Recipe>>(base, { search: search.trim() || undefined, limit: 100 }),
    [base, search]
  );
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<ImportPreview | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const all = useMemo(() => asList(data), [data]);
  const allTags = useMemo(() => [...new Set(all.flatMap((r) => r.tags ?? []))].sort(), [all]);
  const recipes = useMemo(
    () => all.filter((r) => (!tag || (r.tags ?? []).includes(tag)) && (!onlyFavorites || favorites.isFavorite(r._id))),
    [all, tag, onlyFavorites, favorites]
  );

  return (
    <>
      <PageHeader
        title="Recipes"
        subtitle="What you like to cook, with exact amounts."
        action={
          !creating && !importing && !imported ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setImporting(true)}>
                Import from link
              </Button>
              <Button onClick={() => setCreating(true)}>New recipe</Button>
            </div>
          ) : null
        }
      />

      <Guide
        id="recipes"
        title="Adding a recipe"
        steps={[
          <>Start with the name and how many servings the amounts are for.</>,
          <>Add each ingredient: search, then enter the amount. The unit follows your Settings; change it when the recipe says otherwise. If the recipe gives no unit (&ldquo;1 can of beans&rdquo;), tick <strong>No unit</strong>.</>,
          <>Can&rsquo;t find an ingredient? Add it on the spot. Say how recipes measure it (weight, volume or count) and, if you like, how it&rsquo;s sold, such as a can or a bag, so shopping lists say &ldquo;2 cans&rdquo;.</>,
          <>Tag it (dinner, side, dessert). Tags set the course when you add it to a meal plan.</>,
          <>Found one online? Use <strong>Import from link</strong>, check the lines it flags, and save.</>,
          <>Tap the heart on recipes you love. They show first when you plan meals.</>,
        ]}
        tip="Amounts show in your own units. Tap or hover a converted amount to see it as written."
      />

      {importing && !imported ? (
        <Card className="mb-5">
          <RecipeImportStart
            householdId={household._id}
            onCancel={() => setImporting(false)}
            onPreview={(p) => setImported(p)}
          />
        </Card>
      ) : null}

      {imported ? (
        <Card className="mb-5">
          <ImportedRecipe
            householdId={household._id}
            preview={imported}
            onCancel={() => {
              setImported(null);
              setImporting(false);
            }}
            onSaved={() => {
              setImported(null);
              setImporting(false);
              reload();
            }}
          />
        </Card>
      ) : null}

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

      {allTags.length > 0 || favorites.available ? (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          <TagChip active={tag === null && !onlyFavorites} onClick={() => { setTag(null); setOnlyFavorites(false); }}>
            All
          </TagChip>
          {favorites.available ? (
            <TagChip active={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}>
              ♥ Favorites
            </TagChip>
          ) : null}
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
        search || tag || onlyFavorites ? (
          <EmptyState title="No recipes match" body={onlyFavorites ? "No favorites yet. Tap the heart on a recipe to add it." : "Try a different word, or clear the search and tag filter."} />
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
                <FavoriteButton recipeId={r._id} name={r.name} />
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
  const detail = useIngredientDetails(householdId, lines.map((l) => refId(l.ingredientId)));
  const { prefs } = usePrefs();

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
                <span className="shrink-0 text-muted">
                  {l.toTaste ? "to taste" : (() => {
                    const shown = displayAmount(l, detail(refId(l.ingredientId)), prefs);
                    return (
                      <span title={shown.converted ? `As written: ${amount(l.quantity, l.unit)}` : undefined}>
                        {shown.converted ? "≈ " : ""}
                        {shown.text}
                      </span>
                    );
                  })()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {recipe.sourceUrl && /^https?:\/\//i.test(recipe.sourceUrl) ? (
        <p className="text-muted sm:col-span-2">
          Source:{" "}
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
            {hostOf(recipe.sourceUrl)}
          </a>
        </p>
      ) : null}
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
      toTaste: Boolean(l.toTaste),
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
  /** "Salt, to taste": no amount or unit. */
  toTaste?: boolean;
  /** Fields this form doesn't edit (notes, group, original text) are kept as they were. */
  extra?: Record<string, unknown>;
  /** Set on lines imported from a web page. */
  from?: string;
  searchHint?: string;
  hint?: LineHint | undefined;
}

interface ImportedStart {
  name: string;
  servings: number;
  steps: string[];
  tags: string[];
  sourceUrl: string;
  description?: string | undefined;
  prepTimeMinutes?: number | undefined;
  cookTimeMinutes?: number | undefined;
}

function ImportedRecipe({ householdId, preview, onCancel, onSaved }: { householdId: string; preview: ImportPreview; onCancel: () => void; onSaved: () => void }) {
  const { prefs } = usePrefs();
  const initialLines = useMemo<Line[]>(() => previewToFormLines(preview, prefs).map((l) => ({ ...l, key: ++lineKey })), [preview, prefs]);
  const initial: ImportedStart = {
    name: preview.name,
    servings: preview.servings,
    steps: preview.steps,
    tags: preview.tags,
    sourceUrl: preview.sourceUrl,
    description: preview.description,
    prepTimeMinutes: preview.prepTimeMinutes,
    cookTimeMinutes: preview.cookTimeMinutes,
  };
  return (
    <RecipeForm
      householdId={householdId}
      initialLines={initialLines}
      initial={initial}
      servingsGuessed={preview.servingsGuessed}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  );
}

const TAG_SUGGESTIONS = ["breakfast", "lunch", "dinner", "side", "dessert", "snack", "vegetarian", "quick"];

let lineKey = 0;
const newLine = (): Line => ({ key: ++lineKey, ingredient: null, quantity: "", unit: "g", optional: false });

function RecipeForm({
  householdId,
  existing,
  initialLines,
  initial,
  servingsGuessed,
  onCancel,
  onSaved,
}: {
  householdId: string;
  existing?: Recipe;
  initialLines?: Line[];
  initial?: ImportedStart;
  servingsGuessed?: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { prefs } = usePrefs();
  const [name, setName] = useState(existing?.name ?? initial?.name ?? "");
  const [servings, setServings] = useState(existing ? String(existing.servings) : initial ? String(initial.servings) : "2");
  const [steps, setSteps] = useState((existing?.steps ?? initial?.steps ?? []).join("\n"));
  const [tags, setTags] = useState((existing?.tags ?? initial?.tags ?? []).join(", "));
  const [lines, setLines] = useState<Line[]>(initialLines && initialLines.length > 0 ? initialLines : [newLine()]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);
  const [localError, setLocalError] = useState<Record<string, string>>({});

const clearsHint = (h: LineHint | undefined, patch: Partial<Line>) =>
    h !== undefined &&
    (("ingredient" in patch && h.kind !== "amount") || ("unit" in patch && h.kind === "unit") || ("quantity" in patch && h.kind === "amount"));
  // what each line's ingredient is known to weigh, so a unit that can't be converted is caught here
  const detail = useIngredientDetails(householdId, lines.flatMap((l) => (l.ingredient ? [l.ingredient.id] : [])));
  const infoOf = (l: Line): (WeightInfo & { shared: boolean | undefined }) | null => {
    if (!l.ingredient) return null;
    const p = l.ingredient;
    const d = detail(p.id);
    return {
      baseUnitType: p.baseUnitType ?? d?.baseUnitType,
      gramsPerMl: p.gramsPerMl ?? d?.gramsPerMl,
      gramsPerPiece: p.gramsPerPiece ?? d?.gramsPerPiece,
      package: p.package ?? d?.package ?? null,
      shared: p.shared ?? (d ? d.householdId == null : undefined),
    };
  };
  const needsOf = (l: Line) => (l.toTaste ? [] : missingWeights(infoOf(l), l.unit));

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch, ...(clearsHint(l.hint, patch) ? { hint: undefined } : {}) } : l)));

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
      if (!l.toTaste && (l.quantity.trim() === "" || !Number.isFinite(q) || q < 0)) errs[`line.${i}.quantity`] = "Enter an amount, or tick “To taste”.";
      if (l.ingredient && needsOf(l).length > 0) errs[`line.${i}.ingredient`] = "Add the missing weight below, or pick a different unit.";
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
      ...(initial && !existing
        ? {
            sourceUrl: initial.sourceUrl,
            ...(initial.description ? { description: initial.description } : {}),
            ...(initial.prepTimeMinutes ? { prepTimeMinutes: initial.prepTimeMinutes } : {}),
            ...(initial.cookTimeMinutes ? { cookTimeMinutes: initial.cookTimeMinutes } : {}),
          }
        : {}),
      ingredients: filled.map((l) => ({
        ...(l.extra ?? {}),
        ingredientId: l.ingredient!.id,
        ...(l.toTaste ? { toTaste: true } : { quantity: Number(l.quantity), unit: l.unit, ...(existing ? { toTaste: false } : {}) }),
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

  const tagSet = new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
  const toggleTag = (t: string) => {
    const next = new Set(tagSet);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setTags([...next].join(", "));
  };

  const fe = { ...fieldErrors(problem), ...localError };
  const general = problem && Object.keys(fieldErrors(problem)).length === 0 ? messageOf(problem) : null;
  const filledIndex = (key: number) => lines.filter((l) => l.ingredient || l.quantity.trim() !== "").findIndex((l) => l.key === key);

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {initial ? (
        <div className="rounded-lg bg-soft p-3 text-sm text-ink" role="status">
          <p>
            <strong>Imported from {hostOf(initial.sourceUrl)}.</strong> Look it over, fix anything that&rsquo;s off, then save.
          </p>
          {needsAttention(lines) > 0 ? (
            <p className="mt-1 text-warn">
              {needsAttention(lines)} ingredient {needsAttention(lines) === 1 ? "line needs" : "lines need"} a look before you can save.
            </p>
          ) : null}
          {servingsGuessed ? <p className="mt-1 text-warn">The page didn&rsquo;t say how many servings it makes, so check that number.</p> : null}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Recipe name" htmlFor="r-name" error={fe.name}>
          <input id="r-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Servings" htmlFor="r-serv" error={fe.servings}>
          <input id="r-serv" className={inputCls} inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
        </Field>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Ingredients <span className="font-normal text-muted">(amounts for the servings above)</span></legend>
        {lines.map((l) => {
          const i = filledIndex(l.key);
          return (
            <div key={l.key} className="grid grid-cols-2 gap-x-2 gap-y-3 rounded-lg border border-field bg-soft/40 p-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-end sm:gap-2">
              <p className="col-span-2 text-xs font-semibold uppercase tracking-wide text-muted sm:hidden">Ingredient {lines.indexOf(l) + 1}</p>
              <div className="col-span-2 sm:col-span-1">
              <IngredientPicker
                householdId={householdId}
                label="Ingredient"
                value={l.ingredient}
                searchHint={l.searchHint}
                onChange={(ing) => update(l.key, { ingredient: ing, ...(ing && !l.from ? { unit: defaultUnitFor(ing, prefs) } : {}) })}
                error={fe[`line.${i}.ingredient`] ?? fe[`ingredients.${i}.ingredientId`]}
              />
              </div>
              {l.toTaste ? (
                <p className="col-span-2 self-center text-sm text-muted sm:col-span-2">to taste, no amount</p>
              ) : null}
              {l.toTaste ? null : <Field label="Amount" error={fe[`line.${i}.quantity`] ?? fe[`ingredients.${i}.quantity`]}>
                <input className={inputCls} inputMode="decimal" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
              </Field>}
              {l.toTaste ? null : <Field label="Unit" error={fe[`ingredients.${i}.unit`]}>
                <select
                  className={inputCls}
                  value={l.unit}
                  disabled={l.unit === "piece" && l.ingredient?.baseUnitType !== "count"}
                  onChange={(e) => update(l.key, { unit: e.target.value as Unit })}
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.value === "piece" ? "no unit" : u.label}
                    </option>
                  ))}
                </select>
                {l.ingredient?.baseUnitType !== "count" ? (
                  <label
                    className="flex min-h-9 items-center gap-2 text-sm text-ink"
                    title="Counts whole items, or full packages when the ingredient has a package size, like “1 can”."
                  >
                    <input
                      type="checkbox"
                      className="size-5 sm:size-4"
                      checked={l.unit === "piece"}
                      onChange={(e) => update(l.key, { unit: e.target.checked ? "piece" : defaultUnitFor(l.ingredient ?? undefined, prefs) })}
                    />
                    No unit
                  </label>
                ) : null}
              </Field>}
              <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-start sm:pb-1.5">
                <label className="flex min-h-11 items-center gap-2 text-sm text-ink sm:min-h-0 sm:text-xs sm:text-muted">
                  <input type="checkbox" className="size-5 sm:size-4" checked={l.optional} onChange={(e) => update(l.key, { optional: e.target.checked })} />
                  Optional
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm text-ink sm:min-h-0 sm:text-xs sm:text-muted" title="For salt, pepper and the like. No amount is needed.">
                  <input type="checkbox" className="size-5 sm:size-4" checked={Boolean(l.toTaste)} onChange={(e) => update(l.key, { toTaste: e.target.checked })} />
                  To taste
                </label>
                {lines.length > 1 ? (
                  <Button variant="ghost" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove this ingredient">
                    <span aria-hidden="true">✕</span>
                    <span className="sm:hidden">Remove</span>
                  </Button>
                ) : null}
              </div>
              {l.from ? <p className="col-span-full text-xs text-muted">From the recipe: &ldquo;{l.from}&rdquo;</p> : null}
              {l.hint ? (
                <div className={`col-span-full rounded-md px-3 py-2 text-sm ${l.hint.kind === "check" ? "bg-soft text-ink" : "bg-warn-bg text-warn"}`} role="note">
                  <p>{l.hint.text}</p>
                  {l.hint.suggestions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {l.hint.suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="min-h-9 rounded-full border border-field bg-surface px-3 text-sm font-medium text-ink hover:bg-soft"
                          onClick={() => update(l.key, { ingredient: s })}
                        >
                          Use {s.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {l.ingredient && needsOf(l).length > 0 ? (
                <WeightPrompt
                  householdId={householdId}
                  ingredient={{ id: l.ingredient.id, name: l.ingredient.name, shared: infoOf(l)?.shared }}
                  unit={l.unit}
                  needs={needsOf(l)}
                  alternative={defaultUnitFor({ baseUnitType: infoOf(l)?.baseUnitType }, prefs)}
                  onUseAlternative={() => update(l.key, { unit: defaultUnitFor({ baseUnitType: infoOf(l)?.baseUnitType }, prefs) })}
                  onSaved={(u) =>
                    update(l.key, {
                      ingredient: { ...l.ingredient!, gramsPerMl: u.gramsPerMl ?? null, gramsPerPiece: u.gramsPerPiece ?? null },
                    })
                  }
                />
              ) : null}
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

      <Field label="Tags (categories)" htmlFor="r-tags" hint="Tap to add, or type your own separated by commas." error={fe.tags}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested tags">
          {TAG_SUGGESTIONS.map((t) => {
            const on = tagSet.has(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTag(t)}
                className={`min-h-9 rounded-full border px-3 text-sm font-medium ${on ? "border-accent bg-accent text-accent-ink" : "border-field bg-surface text-ink hover:bg-soft"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <input id="r-tags" className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dinner, vegetarian" />
      </Field>

      <Field label="Steps" htmlFor="r-steps" hint="One step per line. Optional.">
        <textarea id="r-steps" rows={5} className={inputCls} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </Field>

      {general ? (
        <p role="alert" className="text-sm text-bad">
          {general}
        </p>
      ) : null}
      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur max-sm:[&>button]:flex-1 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
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
