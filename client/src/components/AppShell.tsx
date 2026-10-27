import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useHousehold } from "../auth/HouseholdContext";
import { Button } from "./ui";

const links = [
  { to: "/pantry", label: "Pantry" },
  { to: "/recipes", label: "Recipes" },
  { to: "/match", label: "What can I cook?" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { household, households, select } = useHousehold();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl">Plantry</span>
            {households.length > 1 ? (
              <select
                aria-label="Household"
                className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
                value={household._id}
                onChange={(e) => select(e.target.value)}
              >
                {households.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-muted">{household.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  isActive ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
