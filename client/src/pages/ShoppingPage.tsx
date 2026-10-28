import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useHousehold } from "../auth/HouseholdContext";
import { Badge, Button, Card, ErrorBanner, Field, inputCls, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { ApiError } from "../lib/api";
import { api } from "../lib/client";
import { amount, localToday, UNITS } from "../lib/format";
import type { ShoppingItem, ShoppingList, Unit } from "../lib/types";

export function ShoppingPage() {
  const { planId = "" } = useParams();
  const { household } = useHousehold();
  const base = `/api/households/${household._id}/meal-plans/${planId}/shopping-list`;
  const { data, error, loading, reload } = useAsync(() => api.get<ShoppingList>(base), [base]);
  const [latest, setLatest] = useState<ShoppingList | null>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const [includeStaples, setIncludeStaples] = useState(false);
  const [unitSystem, setUnitSystem] = useState<"metric" | "us">("metric");

  const list = latest ?? data;
  const noList = error instanceof ApiError && error.status === 404 && !latest;

  /** Every list-changing call returns the whole updated list, so just show it. */
  const run = async (fn: () => Promise<ShoppingList>) => {
    setProblem(null);
    try {
      setLatest(await fn());
    } catch (e) {
      setProblem(e);
    }
  };

  const generate = () => run(() => api.post<ShoppingList>(base, { fromDate: localToday(), includeStaples, unitSystem }));

  const back = (
    <p className="mb-2 text-sm">
      <Link to={`/plans/${planId}`} className="text-muted underline">
        Back to plan
      </Link>
    </p>
  );

  if (loading && !data && !latest) return <Loading />;

  const options = (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={includeStaples} onChange={(e) => setIncludeStaples(e.target.checked)} />
        Include staples
      </label>
      <label className="flex items-center gap-1.5">
        Units
        <select
          className="rounded-md border border-line bg-surface px-2 py-1 text-ink"
          value={unitSystem}
          onChange={(e) => setUnitSystem(e.target.value as "metric" | "us")}
        >
          <option value="metric">Metric</option>
          <option value="us">US</option>
        </select>
      </label>
    </div>
  );

  if (noList) {
    return (
      <>
        {back}
        <PageHeader title="Shopping list" subtitle="Nothing generated for this plan yet." />
        <Card className="grid gap-4">
          <p className="text-sm">Plantry compares the plan against your pantry and lists only what you need to buy.</p>
          {options}
          {problem ? <ErrorBanner error={problem} /> : null}
          <div>
            <Button onClick={generate}>Generate shopping list</Button>
          </div>
        </Card>
      </>
    );
  }
  if (error && !list) return <ErrorBanner error={error} onRetry={reload} />;
  if (!list) return null;

  const items = list.items ?? [];
  const extras = list.extraItems ?? [];
  const total = items.length + extras.length;
  const done = items.filter((i) => i.checked).length + extras.filter((i) => i.checked).length;
  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <>
      {back}
      <PageHeader
        title="Shopping list"
        subtitle={total === 0 ? "You have everything this plan needs." : `${done} of ${total} checked off`}
        action={
          <Button variant="secondary" onClick={generate}>
            Regenerate
          </Button>
        }
      />
      <div className="mb-4">{options}</div>
      {problem ? (
        <div className="mb-4">
          <ErrorBanner error={problem} />
        </div>
      ) : null}
      {(list.warnings ?? []).length > 0 ? (
        <ul className="mb-4 grid gap-1 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          {list.warnings.map((w, i) => (
            <li key={i}>{w.message}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-6">
        {categories.map((cat) => (
          <section key={cat} aria-label={cat}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{cat}</h2>
            <ul className="grid gap-2">
              {items
                .filter((i) => i.category === cat)
                .map((i) => (
                  <GeneratedRow key={i.ingredientId} item={i} base={base} run={run} />
                ))}
            </ul>
          </section>
        ))}

        <section aria-label="Added by you">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Added by you</h2>
          <ul className="mb-3 grid gap-2">
            {extras.map((x) => (
              <li key={x._id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
                <label className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={x.checked}
                    onChange={(e) => run(() => api.patch<ShoppingList>(`${base}/custom-items/${x._id}`, { checked: e.target.checked }))}
                  />
                  <span className={`truncate ${x.checked ? "text-muted line-through" : ""}`}>
                    {x.name}
                    {x.quantity !== undefined && x.unit ? <span className="text-muted"> &middot; {amount(x.quantity, x.unit)}</span> : null}
                  </span>
                </label>
                <Button variant="ghost" aria-label={`Remove ${x.name}`} onClick={() => run(() => api.del<ShoppingList>(`${base}/custom-items/${x._id}`))}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <AddCustom onAdd={(body) => run(() => api.post<ShoppingList>(`${base}/custom-items`, body))} />
        </section>

        {(list.covered ?? []).length > 0 ? (
          <details className="rounded-xl border border-line bg-surface p-3">
            <summary className="cursor-pointer text-sm font-medium">Already in your pantry ({list.covered.length})</summary>
            <ul className="mt-2 grid gap-1 text-sm text-muted">
              {list.covered.map((c) => (
                <li key={c.ingredientId} className="flex justify-between gap-3">
                  <span>{c.name}</span>
                  <span>{amount(c.display.needed, c.display.unit)}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </>
  );
}

function GeneratedRow({ item, base, run }: { item: ShoppingItem; base: string; run: (fn: () => Promise<ShoppingList>) => Promise<void> }) {
  const url = `${base}/items/${item.ingredientId}`;
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
      <label className="flex min-w-0 items-center gap-3">
        <input type="checkbox" checked={item.checked} onChange={(e) => run(() => api.patch<ShoppingList>(url, { checked: e.target.checked }))} />
        <span className={`truncate ${item.checked ? "text-muted line-through" : ""}`}>{item.name}</span>
      </label>
      <div className="flex shrink-0 items-center gap-2">
        {item.have > 0 ? <Badge>have some</Badge> : null}
        <span className="text-sm text-muted">{amount(item.display.toBuy, item.display.unit)}</span>
        <Button variant="ghost" aria-label={`Remove ${item.name}`} onClick={() => run(() => api.del<ShoppingList>(url))}>
          Remove
        </Button>
      </div>
    </li>
  );
}

function AddCustom({ onAdd }: { onAdd: (body: { name: string; quantity?: number; unit?: Unit }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<Unit>("piece");
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = Number(qty);
    if (name.trim() === "") return setErr("Say what to add.");
    if (qty.trim() !== "" && (!Number.isFinite(q) || q <= 0)) return setErr("Amount must be above zero, or leave it blank.");
    setErr(undefined);
    setBusy(true);
    await onAdd({ name: name.trim(), ...(qty.trim() !== "" ? { quantity: q, unit } : {}) });
    setBusy(false);
    setName("");
    setQty("");
  };

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_6rem_7rem_auto] sm:items-end" noValidate>
      <Field label="Add something else" htmlFor="c-name" error={err}>
        <input id="c-name" className={inputCls} placeholder="Paper towels" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Amount" htmlFor="c-qty">
        <input id="c-qty" className={inputCls} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
      </Field>
      <Field label="Unit" htmlFor="c-unit">
        <select id="c-unit" className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" variant="secondary" disabled={busy}>
        Add
      </Button>
    </form>
  );
}

