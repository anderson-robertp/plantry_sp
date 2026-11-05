import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, ErrorBanner, Field, inputCls } from "../components/ui";
import { api } from "../lib/client";
import { householdStore } from "../lib/token";
import type { InvitePreview } from "../lib/types";

/** Joining a household from an invite link (/join/<token>) or by typing the short code (/join). */
export function JoinPage() {
  const { secret: fromLink } = useParams();
  const [value, setValue] = useState(fromLink ?? "");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const look = async (secret: string) => {
    if (secret.trim() === "") return;
    setBusy(true);
    setProblem(null);
    setPreview(null);
    try {
      setPreview(await api.post<InvitePreview>("/api/invites/preview", { secret: secret.trim() }));
    } catch (e) {
      setProblem(e);
    } finally {
      setBusy(false);
    }
  };

  // opened from a link: look it up straight away
  useEffect(() => {
    if (fromLink) void look(fromLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLink]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void look(value);
  };

  const join = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await api.post<{ householdId: string; householdName: string }>("/api/invites/accept", { secret: value.trim() });
      householdStore.set(res.householdId);
      window.location.assign("/"); // reload so the new household is picked up everywhere
    } catch (e) {
      setProblem(e);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-4 px-4 py-10">
      <h1 className="font-display text-3xl">Join a household</h1>

      {!preview || problem ? (
        <Card>
          <form onSubmit={submit} className="grid gap-3">
            <Field label="Invite link or code" htmlFor="j-secret" hint="Paste the link, or type the code, like K7QM-2XWD.">
              <input id="j-secret" className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" autoFocus={!fromLink} />
            </Field>
            {problem ? <ErrorBanner error={problem} /> : null}
            <div>
              <Button type="submit" disabled={busy || value.trim() === ""}>
                {busy ? "Checking…" : "Continue"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="grid gap-3">
          <p>
            You've been invited to join <strong>{preview.householdName}</strong>
            <span className="text-muted"> ({preview.memberCount} {preview.memberCount === 1 ? "person" : "people"} so far)</span>.
          </p>
          {preview.alreadyMember ? (
            <p className="text-sm text-muted">You're already in this household.</p>
          ) : preview.full ? (
            <p className="text-sm text-bad">This household is full, so you can't join right now.</p>
          ) : (
            <p className="text-sm text-muted">You'll see its pantry, recipes, meal plans and shopping lists, and they'll see yours if you add any.</p>
          )}
          <div className="flex gap-2">
            {!preview.alreadyMember && !preview.full ? (
              <Button onClick={join} disabled={busy}>
                {busy ? "Joining…" : `Join ${preview.householdName}`}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Use a different invite
            </Button>
          </div>
        </Card>
      )}

      <p className="text-sm text-muted">
        <Link to="/" className="underline">
          Back to Plantry
        </Link>
      </p>
    </main>
  );
}
