import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { buildNav, groupIsActive, isUnder, type NavEntry } from "../lib/nav";

const tab = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-1 whitespace-nowrap border-b-2 px-3 text-sm font-medium sm:min-h-10 ${
    active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
  }`;

/** The main menu: a few top-level tabs, with related pages grouped into dropdowns that open on tap. */
export function MainNav({ isAdmin }: { isAdmin: boolean }) {
  const { pathname } = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const entries = buildNav(isAdmin);

  // close when you go somewhere, click elsewhere, or press Escape
  useEffect(() => setOpenKey(null), [pathname]);
  useEffect(() => {
    if (!openKey) return;
    const away = (e: Event) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpenKey(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenKey(null);
      root.current?.querySelector<HTMLButtonElement>(`[data-group="${openKey}"]`)?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [openKey]);

  return (
    <nav ref={root} aria-label="Main" className="mx-auto flex max-w-4xl flex-wrap gap-x-1 px-2 sm:px-3">
      {entries.map((e: NavEntry) =>
        e.kind === "link" ? (
          <NavLink key={e.to} to={e.to} end={e.end ?? false} className={({ isActive }) => tab(isActive)}>
            {e.label}
          </NavLink>
        ) : (
          <div key={e.key} className="relative">
            <button
              type="button"
              data-group={e.key}
              aria-expanded={openKey === e.key}
              aria-controls={`menu-${e.key}`}
              className={tab(groupIsActive(pathname, e.items))}
              onClick={() => setOpenKey(openKey === e.key ? null : e.key)}
            >
              {e.label}
              <span aria-hidden="true" className={`text-xs transition-transform ${openKey === e.key ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
            {openKey === e.key ? (
              <ul
                id={`menu-${e.key}`}
                className={`absolute top-full z-30 mt-1 min-w-48 rounded-lg border border-field bg-surface py-1 shadow-lg ${e.align === "right" ? "right-0" : "left-0"}`}
              >
                {e.items.map((i) => (
                  <li key={i.to}>
                    <Link
                      to={i.to}
                      aria-current={isUnder(pathname, i.to) ? "page" : undefined}
                      className={`flex min-h-11 items-center px-4 text-sm hover:bg-soft sm:min-h-10 ${isUnder(pathname, i.to) ? "font-semibold text-ink" : "text-ink"}`}
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      )}
    </nav>
  );
}
