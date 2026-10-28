import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useHousehold } from "../auth/HouseholdContext";
import { Button, Card, EmptyState, ErrorBanner, Field, inputCls, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { addDays, asList, dayLabel, localToday } from "../lib/format";
import type { Listed, MealPlan } from "../lib/types";

export function PlansPage() {
  const { household } = useHousehold();
  const base = `/api/households/${household._id}/meal-plans`;
  const { data, error, loading, reload } = useAsync(() => api.get<Listed<MealPlan>>(base, { limit: 50 }), [base]);
  const [creating, setCreating] = useState(false);
  const plans = asList(data);

  return (
    <>
      <PageHeader
        title="Meal plans"
        subtitle="Decide what you'll cook, then shop for exactly that."
        action={!creating ? <Button onClick={() => setCreating(true)}>New plan</Button> : null}
      />
      {creating ? (
        <Card className="mb-5">
          <NewPlanForm
            base={base}
            onCancel={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              reload();
            }}
          />
        </Card>
      ) : null}
      {loading && !data ? <Loading /> : null}
      {error ? <ErrorBanner error={error} onRetry={reload} /> : null}
      {!loading && !error && plans.length === 0 ? (
        <EmptyState
          title="No meal plans yet"
          body="Pick a week, add the recipes you want to cook, and Plantry builds the shopping list."
          action={!creating ? <Button onClick={() => setCreating(true)}>Plan a week</Button> : null}
        />
      ) : null}
      <ul className="grid gap-3">
        {plans.map((p) => (
          <li key={p._id}>
            <Link to={`/plans/${p._id}`} className="block rounded-xl border border-line bg-surface p-4 hover:bg-soft">
              <p className="font-medium">{p.name || "Untitled plan"}</p>
              <p className="text-sm text-muted">
                {dayLabel(p.startDate)} to {dayLabel(p.endDate)} &middot; {p.entries.length} meal{p.entries.length === 1 ? "" : "s"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function NewPlanForm({ base, onCancel, onSaved }: { base: string; onCancel: () => void; onSaved: () => void }) {
  const today = localToday();
  const [name, setName] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 6));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      await api.post(base, { ...(name.trim() ? { name: name.trim() } : {}), startDate: start, endDate: end, entries: [] });
      onSaved();
    } catch (err) {
      setProblem(err);
      setBusy(false);
    }
  };
  const fe = fieldErrors(problem);
  const general = problem && Object.keys(fe).length === 0 ? messageOf(problem) : null;

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Name (optional)" htmlFor="p-name" error={fe.name}>
        <input id="p-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Week of Oct 26" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First day" htmlFor="p-start" error={fe.startDate}>
          <input id="p-start" type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} required />
        </Field>
        <Field label="Last day" htmlFor="p-end" error={fe.endDate ?? fe.entries}>
          <input id="p-end" type="date" className={inputCls} value={end} min={start} onChange={(e) => setEnd(e.target.value)} required />
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
          {busy ? "Creating…" : "Create plan"}
        </Button>
      </div>
    </form>
  );
}
