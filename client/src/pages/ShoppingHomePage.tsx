import { Link, Navigate } from "react-router-dom";
import { useHousehold } from "../auth/HouseholdContext";
import { EmptyState, ErrorBanner, Loading, PageHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/client";
import { asList, localToday, pickFocusPlan } from "../lib/format";
import type { Listed, MealPlan } from "../lib/types";

/** The "Shopping" tab: sends you to the list for your current plan. */
export function ShoppingHomePage() {
  const { household } = useHousehold();
  const { data, error, loading, reload } = useAsync(
    () => api.get<Listed<MealPlan>>(`/api/households/${household._id}/meal-plans`, { limit: 100 }),
    [household._id]
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBanner error={error} onRetry={reload} />;

  const plan = pickFocusPlan(asList(data), localToday());
  if (plan) return <Navigate to={`/plans/${plan._id}/shopping`} replace />;

  return (
    <>
      <PageHeader title="Shopping list" />
      <EmptyState
        title="No meal plan yet"
        body="Shopping lists are built from a meal plan. Make a plan and the list shows up here."
        action={
          <Link to="/plans" className="inline-flex rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-ink">
            Plan some meals
          </Link>
        }
      />
    </>
  );
}
