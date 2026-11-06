import { useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { hasSeen, markSeen } from "../lib/seen";
import { Button } from "./ui";

/**
 * A short "how this works" card. Open the first time someone visits the page, then tucked away
 * behind a small help link they can reopen any time.
 */
export function Guide({ id, title, steps, tip }: { id: string; title: string; steps: ReactNode[]; tip?: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? "anon";
  const key = `tip.${id}`;
  const [open, setOpen] = useState(() => !hasSeen(userId, key));

  const close = () => {
    markSeen(userId, key);
    setOpen(false);
  };

  if (!open) {
    return (
      <p className="-mt-3 mb-4">
        <button type="button" className="min-h-9 text-sm font-medium text-accent underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
          How this works
        </button>
      </p>
    );
  }

  return (
    <section aria-label={title} className="mb-5 rounded-xl border border-accent/40 bg-soft p-4">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <ol className="mt-2 grid gap-2 text-sm text-ink">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
              {i + 1}
            </span>
            <span className="min-w-0">{s}</span>
          </li>
        ))}
      </ol>
      {tip ? <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-ink">{tip}</p> : null}
      <div className="mt-3 flex justify-end">
        <Button onClick={close}>Got it</Button>
      </div>
    </section>
  );
}
