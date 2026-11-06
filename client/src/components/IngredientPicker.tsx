import { useEffect, useId, useRef, useState } from "react";
import { rememberIngredient } from "../hooks/useIngredientNames";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { asList, unitLabel, UNITS_FOR } from "../lib/format";
import type { BaseUnitType, Ingredient, Listed, Unit } from "../lib/types";
import { Button, Field, inputCls } from "./ui";

export interface PickedIngredient {
  id: string;
  name: string;
  baseUnitType?: BaseUnitType;
  /** Lets the forms start in cups or grams to suit the person. */
  gramsPerMl?: number | null | undefined;
}

const CATEGORIES = ["produce", "meat", "dairy", "frozen", "canned", "grains", "baking", "condiments", "spices", "beverages", "snacks", "other"];

const MEASURED_BY: { value: BaseUnitType; label: string }[] = [
  { value: "mass", label: "Weight: g, oz, lb (flour, cheese, beans)" },
  { value: "volume", label: "Volume: cups, ml (milk, oil, broth)" },
  { value: "count", label: "Count: pieces (eggs, onions)" },
];

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
}: {
  householdId: string;
  value: PickedIngredient | null;
  onChange: (ing: PickedIngredient) => void;
  label?: string;
  error?: string | undefined;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
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
    onChange({ id: ing._id, name: ing.name, baseUnitType: ing.baseUnitType, gramsPerMl: ing.gramsPerMl });
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
          placeholder={value ? value.name : "Search ingredients…"}
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
          ...(densityG.trim() !== "" ? { gramsPerMl: density } : {}),
        })
      );
    } catch (e) {
      setProblem(e);
      setBusy(false);
    }
  };

  const fe = fieldErrors(problem);
  const general = localError ?? (problem && Object.keys(fe).length === 0 ? messageOf(problem) : null);
  return (
    <div className="grid gap-3 p-3">
      <Field label="Name" error={fe.name}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="In recipes, you measure it by" hint="Fixed once saved, because amounts are stored this way." error={fe.baseUnitType}>
        <select className={inputCls} value={baseUnitType} onChange={(e) => setBaseUnitType(e.target.value as BaseUnitType)}>
          {MEASURED_BY.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="grid gap-2 rounded-lg border border-line p-3">
        <legend className="px-1 text-xs font-medium text-muted">At the store it comes as (optional)</legend>
        <div className="grid grid-cols-[1fr_5rem_6rem] gap-2">
          <Field label="Package" hint="can, bag, box…" error={fe["package.label"]}>
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
        <summary className="cursor-pointer text-sm">Recipes use another kind of unit? (optional)</summary>
        <p className="mt-2 text-xs text-muted">
          Only needed if a recipe measures this differently from the choice above, such as &ldquo;1 can&rdquo; of something you weigh, or &ldquo;1 cup&rdquo; of
          something you weigh.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field label="One piece or can weighs (g)" hint="Can of pork and beans: about 430" error={fe.gramsPerPiece}>
            <input className={inputCls} inputMode="decimal" value={pieceG} onChange={(e) => setPieceG(e.target.value)} />
          </Field>
          <Field label="1 ml weighs (g)" hint="Water, milk, broth: about 1" error={fe.gramsPerMl}>
            <input className={inputCls} inputMode="decimal" value={densityG} onChange={(e) => setDensityG(e.target.value)} />
          </Field>
        </div>
      </details>

      <Field label="Aisle" error={fe.category}>
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      {general ? <p role="alert" className="text-xs text-bad">{general}</p> : null}
      <div className="flex justify-end gap-2">
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
