import { useEffect, useId, useRef, useState } from "react";
import { rememberIngredient } from "../hooks/useIngredientNames";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { asList } from "../lib/format";
import type { BaseUnitType, Ingredient, Listed } from "../lib/types";
import { Button, Field, inputCls } from "./ui";

export interface PickedIngredient {
  id: string;
  name: string;
  baseUnitType?: BaseUnitType;
}

const CATEGORIES = ["produce", "meat", "dairy", "frozen", "canned", "grains", "baking", "condiments", "spices", "beverages", "snacks", "other"];

const MEASURED_BY: { value: BaseUnitType; label: string }[] = [
  { value: "mass", label: "Weight (flour, rice, cheese)" },
  { value: "volume", label: "Volume (milk, oil, broth)" },
  { value: "count", label: "Count (eggs, onions, cans)" },
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
    onChange({ id: ing._id, name: ing.name, baseUnitType: ing.baseUnitType });
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
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);

  const save = async () => {
    setBusy(true);
    setProblem(null);
    try {
      onCreated(await api.post<Ingredient>(`/api/households/${householdId}/ingredients`, { name: name.trim(), baseUnitType, category }));
    } catch (e) {
      setProblem(e);
      setBusy(false);
    }
  };

  const fe = fieldErrors(problem);
  return (
    <div className="grid gap-3 p-3">
      <Field label="Name" error={fe.name}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Measured by" hint="You can't change this later, because amounts are stored this way." error={fe.baseUnitType}>
        <select className={inputCls} value={baseUnitType} onChange={(e) => setBaseUnitType(e.target.value as BaseUnitType)}>
          {MEASURED_BY.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Aisle" error={fe.category}>
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      {problem && Object.keys(fe).length === 0 ? <p className="text-xs text-bad">{messageOf(problem)}</p> : null}
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
