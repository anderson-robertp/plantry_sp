import { useState } from "react";
import { MAX_HOUSEHOLD_SIZE, MIN_HOUSEHOLD_SIZE } from "../lib/household";
import { Button } from "./ui";

/** "How many people usually eat?" with plus and minus buttons. Saves as you go. */
export function HouseholdSize({ value, onSave }: { value: number | null; onSave: (n: number) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const shown = value ?? null;

  const set = async (n: number) => {
    const next = Math.min(MAX_HOUSEHOLD_SIZE, Math.max(MIN_HOUSEHOLD_SIZE, n));
    setBusy(true);
    try {
      await onSave(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="group" aria-label="People in the household" className="flex items-center gap-3">
      <Button variant="secondary" aria-label="One fewer person" disabled={busy || shown === null || shown <= MIN_HOUSEHOLD_SIZE} onClick={() => set((shown ?? 2) - 1)}>
        <span aria-hidden="true">−</span>
      </Button>
      <output aria-live="polite" className="min-w-16 text-center text-lg font-medium text-ink">
        {shown === null ? "Not set" : `${shown} ${shown === 1 ? "person" : "people"}`}
      </output>
      <Button variant="secondary" aria-label="One more person" disabled={busy || (shown !== null && shown >= MAX_HOUSEHOLD_SIZE)} onClick={() => set((shown ?? 1) + 1)}>
        <span aria-hidden="true">+</span>
      </Button>
    </div>
  );
}
