import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useHousehold } from "../auth/HouseholdContext";
import { Badge, Card, ErrorBanner, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/client";
import { amount, dayLabel, localToday, MEAL_SLOTS } from "../lib/format";
import type { Dashboard } from "../lib/types";

const slotLabel = (s: string) => MEAL_SLOTS.find((x) => x.value === s)?.label ?? s;

function Section({ title, link, children }: { title: string; link?: { to: string; label: string }; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
        {link ? (
          <Link to={link.to} className="text-sm text-muted underline">
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

const quiet = (text: string) => <p className="text-sm text-muted">{text}</p>;

export function DashboardPage() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(
    () => api.get<Dashboard>(`/api/households/${household._id}/dashboard`, { today: localToday(), expiringWithinDays: 7, upcomingDays: 7 }),
    [household._id]
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBanner error={error} onRetry={reload} />;
  if (!data) return null;

  const firstName = user?.name?.split(" ")[0];
  const today = data.upcomingMeals.meals.filter((m) => m.date === data.today);
  const later = data.upcomingMeals.meals.filter((m) => m.date !== data.today);
  const sl = data.shoppingList;

  return (
    <>
      <PageHeader title={firstName ? `Hi, ${firstName}` : "Home"} subtitle={dayLabel(data.today)} />

      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <Link to="/pantry" className="rounded-xl border border-line bg-surface p-3 hover:bg-soft">
          <p className="text-2xl font-semibold">{data.pantry.itemCount}</p>
          <p className="text-xs text-muted">in pantry</p>
        </Link>
        <Link to="/recipes" className="rounded-xl border border-line bg-surface p-3 hover:bg-soft">
          <p className="text-2xl font-semibold">{data.recipes.count}</p>
          <p className="text-xs text-muted">recipes</p>
        </Link>
        <Link to="/match" className="rounded-xl border border-line bg-surface p-3 hover:bg-soft">
          <p className="text-2xl font-semibold">{data.recipes.cookableNow}</p>
          <p className="text-xs text-muted">you can cook now</p>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Today" link={{ to: "/plans", label: "Meal plans" }}>
          {today.length === 0 ? (
            quiet("Nothing planned for today.")
          ) : (
            <ul className="grid gap-2">
              {today.map((m) => (
                <li key={m.entryId} className="flex items-center justify-between gap-2">
                  <Link to={`/plans/${m.planId}`} className="min-w-0 truncate hover:underline">
                    {m.recipeName}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
                    {slotLabel(m.slot)} {m.cooked ? <Badge tone="good">cooked</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Shopping" link={sl ? { to: `/plans/${sl.planId}/shopping`, label: "Open list" } : undefined}>
          {!sl ? (
            quiet("No active meal plan. Make one and the list builds from it.")
          ) : sl.total === 0 ? (
            quiet(`Nothing to buy for ${sl.planName || "this plan"}, or the list isn't generated yet.`)
          ) : (
            <div>
              <p className="mb-2 text-sm">
                {sl.checked} of {sl.total} checked off &middot; {sl.remaining} to go
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={sl.percentDone} aria-valuemin={0} aria-valuemax={100} aria-label="Shopping progress">
                <div className="h-full bg-accent" style={{ width: `${sl.percentDone}%` }} />
              </div>
            </div>
          )}
        </Section>

        <Section title={`Use soon (${data.pantry.expiringSoon.count + data.pantry.expired.count})`} link={{ to: "/pantry", label: "Pantry" }}>
          {data.pantry.expired.items.length + data.pantry.expiringSoon.items.length === 0 ? (
            quiet("Nothing is about to expire.")
          ) : (
            <ul className="grid gap-2">
              {data.pantry.expired.items.slice(0, 5).map((i) => (
                <ExpiryLine key={i.id} row={i} />
              ))}
              {data.pantry.expiringSoon.items.slice(0, 8).map((i) => (
                <ExpiryLine key={i.id} row={i} />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Coming up">
          {later.length === 0 ? (
            quiet("No more meals planned this week.")
          ) : (
            <ul className="grid gap-2">
              {later.slice(0, 8).map((m) => (
                <li key={m.entryId} className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/plans/${m.planId}`} className="min-w-0 truncate hover:underline">
                    {m.recipeName}
                  </Link>
                  <span className="shrink-0 text-muted">
                    {dayLabel(m.date)} &middot; {slotLabel(m.slot)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {data.recentCooks.length > 0 ? (
        <div className="mt-4">
          <Section title="Recently cooked">
            <ul className="grid gap-1 text-sm">
              {data.recentCooks.slice(0, 5).map((c) => (
                <li key={c.id} className="flex justify-between gap-3">
                  <span className="truncate">{c.recipeName}</span>
                  <span className="shrink-0 text-muted">{new Date(c.cookedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : null}
    </>
  );
}

function ExpiryLine({ row }: { row: { name: string; quantity: number; unit: string; daysLeft: number } }) {
  const text = row.daysLeft < 0 ? `expired ${-row.daysLeft}d ago` : row.daysLeft === 0 ? "expires today" : `${row.daysLeft}d left`;
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate">
        {row.name} <span className="text-muted">{amount(row.quantity, row.unit)}</span>
      </span>
      <Badge tone={row.daysLeft < 0 ? "bad" : row.daysLeft <= 2 ? "warn" : "neutral"}>{text}</Badge>
    </li>
  );
}
