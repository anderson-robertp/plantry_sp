import { useState } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { Badge, Button, Card, ErrorBanner, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { messageOf } from "../lib/api";
import { api } from "../lib/client";
import { householdStore } from "../lib/token";
import type { CreatedInvite, Member, PendingInvite } from "../lib/types";

const MAX_MEMBERS = 6;

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function PeoplePage() {
  const { household } = useHousehold();
  const base = `/api/households/${household._id}`;
  const members = useAsync(() => api.get<{ items: Member[] }>(`${base}/members`), [base]);
  const list = members.data?.items ?? [];
  const isOwner = list.find((m) => m.you)?.role === "owner";
  const invites = useAsync(
    () => (isOwner ? api.get<{ items: PendingInvite[] }>(`${base}/invites`) : Promise.resolve({ items: [] as PendingInvite[] })),
    [base, isOwner]
  );

  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<void>) => {
    setProblem(null);
    try {
      await fn();
    } catch (e) {
      setProblem(e);
    }
  };

  const createInvite = () =>
    act(async () => {
      setBusy(true);
      try {
        setCreated(await api.post<CreatedInvite>(`${base}/invites`, {}));
        invites.reload();
      } finally {
        setBusy(false);
      }
    });

  if (members.loading && !members.data) return <Loading />;
  if (members.error) return <ErrorBanner error={members.error} onRetry={members.reload} />;

  return (
    <>
      <PageHeader
        title="People"
        subtitle={`${list.length} of ${MAX_MEMBERS} in ${household.name}`}
        action={isOwner ? <Button onClick={createInvite} disabled={busy || list.length >= MAX_MEMBERS}>{busy ? "Creating…" : "Invite someone"}</Button> : null}
      />

      {problem ? (
        <div className="mb-4">
          <ErrorBanner error={problem} />
        </div>
      ) : null}

      {created ? <NewInvite invite={created} onClose={() => setCreated(null)} /> : null}

      <ul className="mb-8 grid gap-2">
        {list.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {m.name} {m.you ? <Badge>you</Badge> : null} {m.role === "owner" ? <Badge tone="good">owner</Badge> : null}
              </p>
              {m.email ? <p className="truncate text-sm text-muted">{m.email}</p> : null}
            </div>
            {m.role !== "owner" && (isOwner || m.you) ? (
              <ConfirmButton
                label={m.you ? "Leave" : "Remove"}
                confirmLabel={m.you ? "Leave household" : `Remove ${m.name}`}
                onConfirm={() =>
                  act(async () => {
                    await api.del(`${base}/members/${m.userId}`);
                    if (m.you) {
                      householdStore.set(null);
                      window.location.assign("/");
                    } else {
                      members.reload();
                    }
                  })
                }
              />
            ) : null}
          </li>
        ))}
      </ul>

      {isOwner ? (
        <section aria-label="Open invites">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Open invites</h2>
          {(invites.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted">None. Invite links work once and expire after 7 days.</p>
          ) : (
            <ul className="grid gap-2">
              {invites.data?.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
                  <span>
                    Created {when(i.createdAt)} &middot; expires {when(i.expiresAt)}
                  </span>
                  <ConfirmButton
                    label="Cancel"
                    confirmLabel="Cancel invite"
                    onConfirm={() =>
                      act(async () => {
                        await api.del(`${base}/invites/${i.id}`);
                        invites.reload();
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}

function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <Button variant="ghost" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  return (
    <span className="flex items-center gap-1">
      <Button variant="danger" onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setAsking(false)}>
        Keep
      </Button>
    </span>
  );
}

/** Shown once, right after an invite is made: the server doesn't keep the link or code. */
function NewInvite({ invite, onClose }: { invite: CreatedInvite; onClose: () => void }) {
  const link = `${window.location.origin}/join/${invite.token}`;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch (e) {
      setCopied(`Couldn't copy (${messageOf(e)}). Select the text and copy it yourself.`);
    }
  };

  return (
    <Card className="mb-6 grid gap-3">
      <div>
        <h2 className="font-medium">Invite ready</h2>
        <p className="text-sm text-muted">
          Send this to one person. It works once and expires {when(invite.invite.expiresAt)}. Copy it now, because it can't be shown again.
        </p>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Link</p>
        <div className="flex gap-2">
          <input readOnly aria-label="Invite link" className="w-full rounded-md border border-line bg-soft px-3 py-2 text-sm" value={link} onFocus={(e) => e.currentTarget.select()} />
          <Button onClick={() => copy(link, "Link copied")}>Copy</Button>
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Or they can enter this code at Join a household</p>
        <div className="flex items-center gap-2">
          <code className="rounded-md bg-soft px-3 py-2 text-lg font-semibold tracking-widest">{invite.code}</code>
          <Button variant="secondary" onClick={() => copy(invite.code, "Code copied")}>
            Copy
          </Button>
        </div>
      </div>
      {copied ? (
        <p role="status" className="text-sm text-good">
          {copied}
        </p>
      ) : null}
      <div>
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      </div>
    </Card>
  );
}
