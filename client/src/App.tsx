import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { HouseholdProvider } from "./auth/HouseholdContext";
import { DashboardPage } from "./pages/DashboardPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/AppShell";
import { ErrorBanner, Loading } from "./components/ui";
import { AdminIngredientsPage } from "./pages/AdminIngredientsPage";
import { useIsAdmin } from "./hooks/useIsAdmin";
import { PrefsProvider } from "./hooks/usePrefs";
import { OnboardingGate } from "./components/Onboarding";
import { SettingsPage } from "./pages/SettingsPage";
import { AuthPage } from "./pages/AuthPage";
import { HouseholdSetupPage } from "./pages/HouseholdSetupPage";
import { JoinPage } from "./pages/JoinPage";
import { MatchPage } from "./pages/MatchPage";
import { PantryPage } from "./pages/PantryPage";
import { PeoplePage } from "./pages/PeoplePage";
import { PlanPage } from "./pages/PlanPage";
import { PlansPage } from "./pages/PlansPage";
import { ShoppingHomePage } from "./pages/ShoppingHomePage";
import { RecipesPage } from "./pages/RecipesPage";
import { ShoppingPage } from "./pages/ShoppingPage";

/** Signed out: the sign-in screen. Signed in: the rest of the app. */
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <AuthPage />;
  return <Outlet />;
}

/** The admin area: only for emails the server lists as admins. The server enforces it too. */
function RequireAdmin() {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <Loading />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Makes sure the person has a household before showing anything that needs one. */
function RequireHousehold() {
  return (
    <HouseholdProvider
      fallback={<Loading />}
      empty={(onCreated) => <HouseholdSetupPage onCreated={onCreated} />}
      error={(e, retry) => (
        <div className="mx-auto max-w-md p-6">
          <ErrorBanner error={e} onRetry={retry} />
        </div>
      )}
    >
      <PrefsProvider>
        <OnboardingGate />
      </PrefsProvider>
    </HouseholdProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route element={<RequireAuth />}>
            {/* Joining comes before the household gate: a new person has no household yet. */}
            <Route path="join" element={<JoinPage />} />
            <Route path="join/:secret" element={<JoinPage />} />
            <Route element={<RequireHousehold />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="pantry" element={<PantryPage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="match" element={<MatchPage />} />
                <Route path="admin" element={<RequireAdmin />}>
                  <Route index element={<Navigate to="/admin/ingredients" replace />} />
                  <Route path="ingredients" element={<AdminIngredientsPage />} />
                </Route>
                <Route path="shopping" element={<ShoppingHomePage />} />
                <Route path="people" element={<PeoplePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="plans" element={<PlansPage />} />
                <Route path="plans/:planId" element={<PlanPage />} />
                <Route path="plans/:planId/shopping" element={<ShoppingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
