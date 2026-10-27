import { useMemo, useState, type FormEvent } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { IngredientPicker, type PickedIngredient } from "../components/IngredientPicker";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, PageHeader, type Tone } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useIngredientNames } from "../hooks/useIngredientNames";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { amount, asList, expiryInfo, LOCATIONS, refId, refName, UNITS } from "../lib/format";
import type { Listed, Location, PantryItem, Unit } from "../lib/types";

/**
 * How the API updates a pantry row. Your routes and the Swagger docs disagreed on this once:
 * set it to whatever pantryRoutes.ts uses.
 */
const UPDATE_METHOD: "PATCH" | "PUT" = "PATCH";

const toneFor = { none: "neutral", ok: "good", soon: "warn", expired: "bad" } as const satisfies Record<string, Tone>;

export function PantryPage() {
  const { household } = useHousehold();
  const base = `/api/households/${household._id}/pantry`;
  const { data, error, loading, reload } = useAsync(() => api.get<Listed<PantryItem>>(base), [base]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const items = useMemo(() => asList(data), [data]);
  const known = useMemo(() => {
    const k: Record<string, string> = {};
    for (const i of items) {
      const n = refName(i.ingredientId);
      if (n) k[refId(i.ingredientId)] = n;
    }
    return k;
  }, [items]);
  const nameOf = useIngredientNames(household._id, items.map((i) => refId(i.ingredientId)), known);

  const grouped = LOCATIONS.map((loc) => ({
    ...loc,
    rows: items
      .filter((i) => (i.location ?? "pantry") === loc.value)
      .sort((a, b) => nameOf(refId(a.ingredientId)).localeCompare(nameOf(refId(b.ingredientId)))),
  })).filter((g) => g.rows.length > 0);

  return (
    <>
      <PageHeader
        title="Pantry"
        subtitle="Everything you have, and when it runs out."
        action={!adding ? <Button onClick={() => setAdding(true)}>Add item</Button> : null}
      />

      {adding ? (
        <Card className="mb-5">
          <PantryForm
            householdId={household._id}
            onCancel={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              reload();
            }}
          />
        </Card>
      ) : null}

      {loading && !data ? <Loading /> : null}
      {error ? <ErrorBanner error={error} onRetry={reload} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Your pantry is empty"
          body="Add what you have on hand. Recipes and shopping lists get smarter with every item."
          action={!adding ? <Button onClick={() => setAdding(true)}>Add your first item</Button> : null}
        />
      ) : null}

      <div className="grid gap-6">
        {grouped.map((g) => (
          <section key={g.value} aria-label={g.label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {g.label} <span className="font-normal">({g.rows.length})</span>
            </h2>
            <ul className="grid gap-2">
              {g.rows.map((item) => {
                const id = refId(item.ingredientId);
                const exp = expiryInfo(item.expirationDate);
                return (
                  <li key={item._id} className="rounded-xl border border-line bg-surface p-3">
                    {editing === item._id ? (
                      <PantryForm
                        householdId={household._id}
                        existing={item}
                        existingName={nameOf(id)}
                        onCancel={() => setEditing(null)}
                        onSaved={() => {
                          setEditing(null);
                          reload();
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{nameOf(id)}</p>
                          <p className="text-sm text-muted">{amount(item.quantity, item.unit)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={toneFor[exp.tone]}>{exp.text}</Badge>
                          <Button variant="ghost" onClick={() => setEditing(item._id)}>
                            Edit
                          </Button>
                          <RemoveButton url={`${base}/${item._id}`} what={nameOf(id)} onDone={reload} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function RemoveButton({ url, what, onDone }: { url: string; what: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Remove
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-2" role="group" aria-label={`Remove ${what}?`}>
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
        {busy ? "Removing…" : `Remove ${what}`}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  );
}

function PantryForm({
  householdId,
  existing,
  existingName,
  onCancel,
  onSaved,
}: {
  householdId: string;
  existing?: PantryItem;
  existingName?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [ingredient, setIngredient] = useState<PickedIngredient | null>(null);
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : "");
  const [unit, setUnit] = useState<Unit>(existing?.unit ?? "g");
  const [expires, setExpires] = useState(existing?.expirationDate ? existing.expirationDate.slice(0, 10) : "");
  const [location, setLocation] = useState<Location>(existing?.location ?? "pantry");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);
  const [localError, setLocalError] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = Number(quantity);
    const errs: Record<string, string> = {};
    if (!existing && !ingredient) errs.ingredientId = "Choose an ingredient.";
    if (quantity.trim() === "" || !Number.isFinite(q) || q < 0) errs.quantity = "Enter an amount of zero or more.";
    setLocalError(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setProblem(null);
    const body = { quantity: q, unit, location, ...(expires ? { expirationDate: expires } : {}) };
    try {
      if (existing) {
        const url = `/api/households/${householdId}/pantry/${existing._id}`;
        if (UPDATE_METHOD === "PUT") await api.put(url, body);
        else await api.patch(url, body);
      } else {
        await api.post(`/api/households/${householdId}/pantry`, { ingredientId: ingredient!.id, ...body });
      }
      onSaved();
    } catch (err) {
      setProblem(err);
      setBusy(false);
    }
  };

  const fe = { ...fieldErrors(problem), ...localError };
  const general = problem && Object.keys(fieldErrors(problem)).length === 0 ? messageOf(problem) : null;

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      {existing ? (
        <p className="font-medium">{existingName}</p>
      ) : (
        <IngredientPicker householdId={householdId} value={ingredient} onChange={setIngredient} error={fe.ingredientId} />
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Amount" htmlFor="qty" error={fe.quantity}>
          <input id="qty" className={inputCls} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Unit" htmlFor="unit" error={fe.unit}>
          <select id="unit" className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expires" htmlFor="exp" error={fe.expirationDate}>
          <input id="exp" type="date" className={inputCls} value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
        <Field label="Kept in" htmlFor="loc" error={fe.location}>
          <select id="loc" className={inputCls} value={location} onChange={(e) => setLocation(e.target.value as Location)}>
            {LOCATIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
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
          {busy ? "Saving…" : existing ? "Save changes" : "Add to pantry"}
        </Button>
      </div>
    </form>
  );
}
