import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { amount, INGREDIENT_CATEGORIES, unitLabel, UNITS_FOR } from "../lib/format";
import type { AdminIngredient, AdminList, BaseUnitType, PackageDef, Unit } from "../lib/types";

const MEASURED_BY: { value: BaseUnitType; label: string }[] = [
  { value: "mass", label: "Weight" },
  { value: "volume", label: "Volume" },
  { value: "count", label: "Count" },
];

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function AdminIngredientsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [missingPackage, setMissingPackage] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const q = useDebounced(search.trim());

  useEffect(() => setPage(1), [q, category, missingPackage]);

  const { data, error, loading, reload } = useAsync(
    () =>
      api.get<AdminList>("/api/admin/ingredients", {
        search: q || undefined,
        category: category || undefined,
        missing: missingPackage ? "package" : undefined,
        page,
        limit: 50,
      }),
    [q, category, missingPackage, page]
  );

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <PageHeader
        title="Shared ingredients"
        subtitle="The catalog every household can use. Changes here are seen by everyone."
        action={!creating ? <Button onClick={() => setCreating(true)}>New ingredient</Button> : null}
      />

      {creating ? (
        <Card className="mb-5">
          <IngredientEditor
            onCancel={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              reload();
            }}
          />
        </Card>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field label="Search" htmlFor="a-search">
          <input id="a-search" className={inputCls} placeholder="Name or alias…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field label="Aisle" htmlFor="a-cat">
          <select id="a-cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm text-muted">
          <input type="checkbox" checked={missingPackage} onChange={(e) => setMissingPackage(e.target.checked)} />
          Missing a package size
        </label>
      </div>

      {loading && !data ? <Loading /> : null}
      {error ? <ErrorBanner error={error} onRetry={reload} /> : null}
      {data && data.items.length === 0 ? <EmptyState title="Nothing matches" body="Try a different search or clear the filters." /> : null}

      <ul className="grid gap-2">
        {data?.items.map((ing) => (
          <li key={ing._id} className="rounded-xl border border-line bg-surface p-3">
            {editing === ing._id ? (
              <IngredientEditor
                id={ing._id}
                onCancel={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null);
                  reload();
                }}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {ing.name} {ing.isStaple ? <Badge>staple</Badge> : null}
                  </p>
                  <p className="text-sm text-muted">
                    {ing.category ?? "other"} &middot;{" "}
                    {ing.package ? `${ing.package.label}, ${amount(ing.package.size, ing.package.unit)}` : <span className="text-warn">no package size</span>}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setEditing(ing._id)}>
                  Edit
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {data && pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {pages} &middot; {data.total} ingredients
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : data ? (
        <p className="mt-4 text-sm text-muted">{data.total} ingredients</p>
      ) : null}
    </>
  );
}

/** Edits one shared ingredient, or creates one when no `id` is given. */
function IngredientEditor({ id, onCancel, onSaved }: { id?: string; onCancel: () => void; onSaved: () => void }) {
  const loaded = useAsync(() => (id ? api.get<AdminIngredient>(`/api/admin/ingredients/${id}`) : Promise.resolve(null)), [id]);
  if (id && loaded.loading && !loaded.data) return <Loading />;
  if (id && loaded.error) return <ErrorBanner error={loaded.error} onRetry={loaded.reload} />;
  return <EditorForm existing={loaded.data ?? undefined} onCancel={onCancel} onSaved={onSaved} />;
}

function EditorForm({ existing, onCancel, onSaved }: { existing?: AdminIngredient | undefined; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.category ?? "other");
  const [aliases, setAliases] = useState((existing?.aliases ?? []).join(", "));
  const [isStaple, setIsStaple] = useState(existing?.isStaple === true);
  const [baseUnitType, setBaseUnitType] = useState<BaseUnitType>(existing?.baseUnitType ?? "mass");
  const [defaultUnit, setDefaultUnit] = useState<Unit | "">(existing?.defaultUnit ?? "");
  const [pkgLabel, setPkgLabel] = useState(existing?.package?.label ?? "");
  const [pkgSize, setPkgSize] = useState(existing?.package ? String(existing.package.size) : "");
  const [pkgUnit, setPkgUnit] = useState<Unit>(existing?.package?.unit ?? "oz");
  const [pieceG, setPieceG] = useState("");
  const [densityG, setDensityG] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const type = existing?.baseUnitType ?? baseUnitType;
  const unitChoices = UNITS_FOR[type];
  const unit: Unit = unitChoices.includes(pkgUnit) ? pkgUnit : (unitChoices[0] ?? "g");
  const aliasList = [...new Set(aliases.split(",").map((a) => a.trim()).filter(Boolean))];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const hasPackage = pkgLabel.trim() !== "";
    const size = Number(pkgSize);
    if (name.trim() === "") return setLocalError("Give it a name.");
    if (hasPackage && !(size > 0)) return setLocalError("Say how big one package is, or clear the package name.");
    const piece = Number(pieceG);
    const density = Number(densityG);
    if (!existing && ((pieceG.trim() !== "" && !(piece > 0)) || (densityG.trim() !== "" && !(density > 0)))) {
      return setLocalError("Weights must be numbers above zero, or left blank.");
    }
    setLocalError(null);
    setBusy(true);
    setProblem(null);
    const pkg: PackageDef | null = hasPackage ? { label: pkgLabel.trim(), size, unit } : null;
    try {
      if (existing) {
        await api.patch(`/api/admin/ingredients/${existing._id}`, {
          name: name.trim(),
          category,
          aliases: aliasList,
          isStaple,
          ...(defaultUnit ? { defaultUnit } : {}),
          // null removes the package; only send null when there was one to remove
          ...(pkg ? { package: pkg } : existing.package ? { package: null } : {}),
        });
      } else {
        await api.post("/api/admin/ingredients", {
          name: name.trim(),
          category,
          baseUnitType,
          aliases: aliasList,
          isStaple,
          ...(defaultUnit ? { defaultUnit } : {}),
          ...(pkg ? { package: pkg } : {}),
          ...(pieceG.trim() !== "" ? { gramsPerPiece: piece } : {}),
          ...(densityG.trim() !== "" ? { gramsPerMl: density } : {}),
        });
      }
      onSaved();
    } catch (err) {
      setProblem(err);
      setBusy(false);
    }
  };

  const fe = fieldErrors(problem);
  const general = localError ?? (problem && Object.keys(fe).length === 0 ? messageOf(problem) : null);

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="ae-name" error={fe.name}>
          <input id="ae-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Aisle" htmlFor="ae-cat" error={fe.category}>
          <select id="ae-cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Other names" htmlFor="ae-alias" hint="Separate with commas. Searching any of these finds this ingredient." error={fe.aliases}>
        <input id="ae-alias" className={inputCls} value={aliases} onChange={(e) => setAliases(e.target.value)} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        {existing ? (
          <div className="text-sm">
            <p className="text-xs font-medium text-muted">Measured by (fixed)</p>
            <p>
              {MEASURED_BY.find((m) => m.value === existing.baseUnitType)?.label}
              {existing.gramsPerMl ? ` · ${existing.gramsPerMl} g/ml` : ""}
              {existing.gramsPerPiece ? ` · ${existing.gramsPerPiece} g/piece` : ""}
            </p>
            {existing.usedBy ? (
              <p className="text-xs text-muted">
                Used by {existing.usedBy.recipes} recipe{existing.usedBy.recipes === 1 ? "" : "s"} and {existing.usedBy.pantry} pantry item
                {existing.usedBy.pantry === 1 ? "" : "s"}.
              </p>
            ) : null}
          </div>
        ) : (
          <Field label="Measured by (can't change later)" htmlFor="ae-type" error={fe.baseUnitType}>
            <select id="ae-type" className={inputCls} value={baseUnitType} onChange={(e) => setBaseUnitType(e.target.value as BaseUnitType)}>
              {MEASURED_BY.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Default unit" htmlFor="ae-def" error={fe.defaultUnit}>
          <select id="ae-def" className={inputCls} value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value as Unit | "")}>
            <option value="">{existing?.defaultUnit ? "Keep current" : "None"}</option>
            {unitChoices.map((u) => (
              <option key={u} value={u}>
                {unitLabel(u)}
              </option>
            ))}
            {type !== "count" ? ["cup", "tbsp", "tsp"].filter((u) => !unitChoices.includes(u as Unit)).map((u) => (
              <option key={u} value={u}>
                {unitLabel(u)}
              </option>
            )) : null}
          </select>
        </Field>
      </div>

      <fieldset className="grid gap-2 rounded-lg border border-line p-3">
        <legend className="px-1 text-xs font-medium text-muted">How it's sold</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_6rem]">
          <Field label="Package" hint="can, bag, box… Clear to remove." error={fe["package.label"]} className="col-span-2 sm:col-span-1">
            <input className={inputCls} value={pkgLabel} onChange={(e) => setPkgLabel(e.target.value)} />
          </Field>
          <Field label="Size" error={fe["package.size"]}>
            <input className={inputCls} inputMode="decimal" value={pkgSize} onChange={(e) => setPkgSize(e.target.value)} />
          </Field>
          <Field label="Unit" error={fe["package.unit"]}>
            <select className={inputCls} value={unit} onChange={(e) => setPkgUnit(e.target.value as Unit)}>
              {unitChoices.map((u) => (
                <option key={u} value={u}>
                  {unitLabel(u)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {!existing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="One piece weighs (g)" hint="Needed for count ingredients" error={fe.gramsPerPiece}>
            <input className={inputCls} inputMode="decimal" value={pieceG} onChange={(e) => setPieceG(e.target.value)} />
          </Field>
          <Field label="1 ml weighs (g)" hint="Needed to convert cups to grams" error={fe.gramsPerMl}>
            <input className={inputCls} inputMode="decimal" value={densityG} onChange={(e) => setDensityG(e.target.value)} />
          </Field>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isStaple} onChange={(e) => setIsStaple(e.target.checked)} />
        Staple (assumed to be in the kitchen; kept off shopping lists)
      </label>

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
          {busy ? "Saving…" : existing ? "Save changes" : "Create ingredient"}
        </Button>
      </div>
    </form>
  );
}
