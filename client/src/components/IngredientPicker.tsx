import { useEffect, useId, useRef, useState } from "react";
import { rememberIngredient } from "../hooks/useIngredientNames";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { asList, unitLabel, UNITS_FOR } from "../lib/format";
import { gramsPerMlFromCup, typicalCupGrams } from "../lib/weights";
import type { BaseUnitType, Ingredient, Listed, Unit } from "../lib/types";
import { Button, Field, inputCls } from "./ui";

export interface PickedIngredient {
  id: string;
  name: string;
  baseUnitType?: BaseUnitType;
  /** Lets the forms start in cups or grams to suit the person. */
  gramsPerMl?: number | null | undefined;
  gramsPerPiece?: number | null | undefined;
  package?: { size: number; unit: Unit } | null | undefined;
  /** true for the shared catalog, which households can't edit */
  shared?: boolean | undefined;
}

const CATEGORIES = ["produce", "meat", "dairy", "frozen", "canned", "grains", "baking", "condiments", "spices", "beverages", "snacks", "other"];

const MEASURED_BY: { value: BaseUnitType; label: string }[] = [
  { value: "mass", label: "Weight: g, oz, lb (flour, cheese, beans)" },
  { value: "volume", label: "Volume: cups, ml (milk, oil, broth)" },
  { value: "count", label: "Count: pieces (eggs, onions)" },
];

const MEASURED_BY_HELP: Record<BaseUnitType, string> = {
  mass: "Amounts are kept in grams. Pick this for things you'd put on a scale: flour, cheese, meat, canned goods.",
  volume: "Amounts are kept in millilitres. Pick this for things you pour: milk, oil, broth.",
  count: "Amounts are kept as whole items. Pick this for things you count: eggs, onions, lemons.",
};

/**
 * Type to search the shared catalog and this household's own ingredients, or add a new one.
 * `value` is the chosen ingredient; picking again replaces it.
 */
export function IngredientPicker({
  householdId,
  value,
  onChange,
  label = "Ingredient",
  error,
  searchHint,
}: {
  householdId: string;
  value: PickedIngredient | null;
  onChange: (ing: PickedIngredient) => void;
  label?: string;
  error?: string | undefined;
  /** Starts the search with this text, for lines imported from a recipe. */
  searchHint?: string | undefined;
}) {
  const inputId = useId();
  const [query, setQuery] = useState(searchHint ?? "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // search as the person types, after a short pause
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      api
        .get<Listed<Ingredient>>(`/api/households/${householdId}/ingredients`, { search: query.trim() || undefined, limit: 8 })
        .then((r) => alive && setResults(asList(r)))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setSearching(false));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, open, householdId]);

  // close when focus or a click leaves the picker
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (ing: Ingredient) => {
    rememberIngredient(householdId, ing);
    onChange({
      id: ing._id,
      name: ing.name,
      baseUnitType: ing.baseUnitType,
      gramsPerMl: ing.gramsPerMl,
      gramsPerPiece: ing.gramsPerPiece,
      package: ing.package ?? null,
      shared: ing.householdId == null,
    });
    setOpen(false);
    setCreating(false);
    setQuery("");
  };

  return (
    <div ref={box} className="relative min-w-0">
      <Field label={label} htmlFor={inputId} error={error}>
        <input
          id={inputId}
          className={inputCls}
          placeholder={value ? value.name : searchHint ? `Find “${searchHint}”` : "Search ingredients…"}
          value={open ? query : value ? value.name : ""}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
        />
      </Field>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-auto rounded-lg border border-line bg-surface p-1 shadow-lg">
          {creating ? (
            <NewIngredientForm
              householdId={householdId}
              initialName={query.trim()}
              onCancel={() => setCreating(false)}
              onCreated={choose}
            />
          ) : (
            <>
              {searching && results.length === 0 ? <p className="px-3 py-2 text-sm text-muted">Searching…</p> : null}
              {!searching && results.length === 0 ? <p className="px-3 py-2 text-sm text-muted">No match.</p> : null}
              <ul>
                {results.map((r) => (
                  <li key={r._id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-soft"
                      onClick={() => choose(r)}
                    >
                      <span className="min-w-0 truncate">{r.name}</span>
                      <span className="shrink-0 text-xs text-muted">{r.category ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-1 w-full rounded-md border-t border-line px-3 py-2 text-left text-sm font-medium text-accent hover:bg-soft"
                onClick={() => setCreating(true)}
              >
                + Add a new ingredient{query.trim() ? ` “${query.trim()}”` : ""}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NewIngredientForm({
  householdId,
  initialName,
  onCancel,
  onCreated,
}: {
  householdId: string;
  initialName: string;
  onCancel: () => void;
  onCreated: (ing: Ingredient) => void;
}) {
  const [name, setName] = useState(initialName);
  const [baseUnitType, setBaseUnitType] = useState<BaseUnitType>("mass");
  const [category, setCategory] = useState("other");
  const [pkgLabel, setPkgLabel] = useState("");
  const [pkgSize, setPkgSize] = useState("");
  const [pkgUnit, setPkgUnit] = useState<Unit>("oz");
  const [pieceG, setPieceG] = useState("");
  const [densityG, setDensityG] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // the package unit has to be the same kind of unit as the way recipes measure it
  const unitChoices = UNITS_FOR[baseUnitType];
  const unit: Unit = unitChoices.includes(pkgUnit) ? pkgUnit : (unitChoices[0] ?? "g");

  const save = async () => {
    const piece = Number(pieceG);
    const density = Number(densityG);
    const size = Number(pkgSize);
    const hasPackage = pkgLabel.trim() !== "";
    if ((pieceG.trim() !== "" && !(piece > 0)) || (densityG.trim() !== "" && !(density > 0))) {
      return setLocalError("Weights must be numbers above zero, or left blank.");
    }
    if (hasPackage && !(size > 0)) return setLocalError("Say how big one package is, or clear the package name.");
    setLocalError(null);
    setBusy(true);
    setProblem(null);
    try {
      onCreated(
        await api.post<Ingredient>(`/api/households/${householdId}/ingredients`, {
          name: name.trim(),
          baseUnitType,
          category,
          ...(hasPackage ? { package: { label: pkgLabel.trim(), size, unit } } : {}),
          ...(pieceG.trim() !== "" ? { gramsPerPiece: piece } : {}),
          ...(densityG.trim() !== "" ? { gramsPerMl: Math.round(gramsPerMlFromCup(density) * 10_000) / 10_000 } : {}),
        })
      );
    } catch (e) {
      setProblem(e);
      setBusy(false);
    }
  };

  const typical = typicalCupGrams(name);
  const fe = fieldErrors(problem);
  const general = localError ?? (problem && Object.keys(fe).length === 0 ? messageOf(problem) : null);
  return (
    <div className="grid gap-3 p-3">
      <Field label="Name" error={fe.name}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="In recipes, you measure it by" hint={`${MEASURED_BY_HELP[baseUnitType]} Can't be changed later.`} error={fe.baseUnitType}>
        <select className={inputCls} value={baseUnitType} onChange={(e) => setBaseUnitType(e.target.value as BaseUnitType)}>
          {MEASURED_BY.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="grid gap-2 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-medium text-ink">At the store it comes as (optional)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_6rem]">
          <Field label="Package" hint="can, bag, box…" error={fe["package.label"]} className="col-span-2 sm:col-span-1">
            <input className={inputCls} value={pkgLabel} onChange={(e) => setPkgLabel(e.target.value)} list="package-labels" />
            <datalist id="package-labels">
              {["can", "bag", "bottle", "box", "jar", "carton", "pack", "bunch", "loaf"].map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
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
        <p className="text-xs text-muted">With this, shopping lists say &ldquo;3 cans&rdquo; instead of a weight.</p>
      </fieldset>

      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer py-1 text-sm font-medium">Do recipes use cups, spoons or pieces of this? (optional)</summary>
        <p className="mt-2 text-xs text-muted">
          If you weigh it but a recipe says &ldquo;1 cup&rdquo;, Plantry needs to know what a cup weighs. You can skip this now; it will ask the first time a recipe needs it.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="One piece or can weighs (g)" hint="Can of pork and beans: about 430" error={fe.gramsPerPiece}>
            <input className={inputCls} inputMode="decimal" value={pieceG} onChange={(e) => setPieceG(e.target.value)} />
          </Field>
          <Field label="1 cup weighs (g)" hint={typical ? `Typical for ${name.trim().toLowerCase()}: about ${typical}` : "Flour about 120, sugar about 200, milk about 245"} error={fe.gramsPerMl}>
            <input className={inputCls} inputMode="decimal" value={densityG} onChange={(e) => setDensityG(e.target.value)} />
            {typical && densityG.trim() === "" ? (
              <button type="button" className="min-h-9 text-left text-sm font-medium text-accent hover:underline" onClick={() => setDensityG(String(typical))}>
                Use {typical} g
              </button>
            ) : null}
          </Field>
        </div>
      </details>

      <Field label="Category (store aisle)" error={fe.category}>
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      {general ? <p role="alert" className="text-xs text-bad">{general}</p> : null}
      <div className="flex justify-end gap-2 max-sm:[&>button]:flex-1">
        <Button variant="ghost" onClick={onCancel}>
          Back
        </Button>
        <Button onClick={save} disabled={busy || name.trim() === ""}>
          {busy ? "Adding…" : "Add ingredient"}
        </Button>
      </div>
    </div>
  );
}
