import { useState, type FormEvent } from "react";
import { Button, Field, inputCls } from "../components/ui";
import { fieldErrors, messageOf } from "../lib/api";
import { api } from "../lib/client";
import { householdStore } from "../lib/token";
import type { Household } from "../lib/types";

/** Shown once, when a new account has no household yet. */
export function HouseholdSetupPage({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const h = await api.post<Household>("/api/households", { name: name.trim() });
      householdStore.set(h._id);
      onCreated();
    } catch (err) {
      setProblem(err);
      setBusy(false);
    }
  };

  const fe = fieldErrors(problem);
  return (
    <div className="mx-auto grid min-h-screen max-w-sm content-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-3xl text-ink">Set up your household</h1>
        <p className="mt-1 text-sm text-muted">Your pantry, recipes and plans live in a household, so the people you cook with can share them.</p>
      </div>
      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-line bg-surface p-5" noValidate>
        <Field label="Household name" htmlFor="hh" error={fe.name} hint="For example, “The Andersons” or “Apartment 4B”.">
          <input id="hh" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {problem && Object.keys(fe).length === 0 ? (
          <p role="alert" className="text-sm text-bad">
            {messageOf(problem)}
          </p>
        ) : null}
        <Button type="submit" disabled={busy || name.trim() === ""}>
          {busy ? "Creating…" : "Create household"}
        </Button>
      </form>
    </div>
  );
}
