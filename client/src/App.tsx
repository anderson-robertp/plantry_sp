import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { HouseholdProvider } from "./auth/HouseholdContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/AppShell";
import { ErrorBanner, Loading } from "./components/ui";
import { AuthPage } from "./pages/AuthPage";
import { HouseholdSetupPage } from "./pages/HouseholdSetupPage";
import { MatchPage } from "./pages/MatchPage";
import { PantryPage } from "./pages/PantryPage";
import { RecipesPage } from "./pages/RecipesPage";

/** Signed out: the sign-in screen. Signed in: the rest of the app. */
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <AuthPage />;
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
      <Outlet />
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
            <Route element={<RequireHousehold />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/pantry" replace />} />
                <Route path="pantry" element={<PantryPage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="match" element={<MatchPage />} />
                <Route path="*" element={<Navigate to="/pantry" replace />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
