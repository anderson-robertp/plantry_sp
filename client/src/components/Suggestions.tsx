import { useHousehold } from "../auth/HouseholdContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/client";
import { localToday } from "../lib/format";
import type { Course, Recommendation } from "../lib/types";

/**
 * Tap-to-pick ideas for the meal being added. Quietly shows nothing when the server has no
 * recommendations endpoint yet, or there is nothing to suggest.
 */
export function Suggestions({
  course,
  planId,
  onPick,
}: {
  course: Course;
  planId: string;
  onPick: (recipeId: string) => void;
}) {
  const { household } = useHousehold();
  const url = `/api/households/${household._id}/recommendations`;
  const { data } = useAsync(
    () => api.get<{ recommendations: Recommendation[] }>(url, { course, planId, today: localToday(), limit: 5 }),
    [url, course, planId]
  );
  const items = data?.recommendations.filter((r) => !r.reasons.some((x) => x.code === "in_plan")) ?? [];
  if (items.length === 0) return null;

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 text-sm font-medium text-ink">Ideas for you</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.recipeId}>
            <button
              type="button"
              onClick={() => onPick(r.recipeId)}
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-left hover:bg-soft focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="block text-sm font-medium text-ink">{r.name}</span>
              <span className="block text-xs text-muted">
                {r.reasons.slice(0, 2).map((x) => x.text).join(" · ") || "Worth a try"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
