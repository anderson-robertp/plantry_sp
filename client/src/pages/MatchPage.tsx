import { useState } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { Badge, Button, EmptyState, ErrorBanner, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/client";
import { amount, localToday } from "../lib/format";
import type { MatchResponse } from "../lib/types";

export function MatchPage() {
  const { household } = useHousehold();
  const [cookableOnly, setCookableOnly] = useState(false);
  const { data, error, loading, reload } = useAsync(
    () =>
      api.get<MatchResponse>(`/api/households/${household._id}/recipes/match`, {
        today: localToday(),
        canCookOnly: cookableOnly ? "true" : undefined,
        limit: 100,
      }),
    [household._id, cookableOnly]
  );

  return (
    <>
      <PageHeader
        title="What can I cook?"
        subtitle={data ? `${data.cookableCount} of your recipes can be made right now.` : "Your recipes, ranked by what's in the pantry."}
        action={
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={cookableOnly} onChange={(e) => setCookableOnly(e.target.checked)} />
            Only what I can make now
          </label>
        }
      />

      {loading && !data ? <Loading label="Checking your pantry…" /> : null}
      {error ? <ErrorBanner error={error} onRetry={reload} /> : null}
      {data && data.matches.length === 0 ? (
        <EmptyState
          title={cookableOnly ? "Nothing you can make right now" : "No recipes yet"}
          body={cookableOnly ? "Turn off the filter to see what's close, and what's missing." : "Add a recipe and it shows up here with what you're missing."}
        />
      ) : null}

      <ul className="grid gap-3">
        {data?.matches.map((m) => (
          <li key={m.recipeId} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="text-sm text-muted">
                  You have {m.haveCount} of {m.totalIngredients} ingredients
                </p>
              </div>
              {m.canCook ? <Badge tone="good">Ready to cook</Badge> : <Badge tone="warn">{Math.round(m.coverage * 100)}% covered</Badge>}
            </div>
            {m.missing.length > 0 ? (
              <div className="mt-3 border-t border-line pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Missing</p>
                <ul className="grid gap-1 text-sm">
                  {m.missing.map((x) => (
                    <li key={x.ingredientId} className="flex justify-between gap-3">
                      <span>{x.name}</span>
                      <span className="shrink-0 text-muted">
                        need {amount(x.display.toBuy, x.display.unit)}
                        {x.have > 0 ? " more" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {data ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={reload}>
            Refresh
          </Button>
        </div>
      ) : null}
    </>
  );
}
