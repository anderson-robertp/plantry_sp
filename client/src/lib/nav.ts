export interface NavItem {
  to: string;
  label: string;
}

export type NavEntry =
  | { kind: "link"; to: string; label: string; end?: boolean }
  | { kind: "group"; key: string; label: string; items: NavItem[]; align?: "left" | "right" };

/** Is this page `to`, or one of the pages under it? "/" only counts when it is exactly "/". */
export function isUnder(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export const groupIsActive = (pathname: string, items: readonly NavItem[]): boolean => items.some((i) => isUnder(pathname, i.to));

export function buildNav(isAdmin: boolean): NavEntry[] {
  return [
    { kind: "link", to: "/", label: "Home", end: true },
    { kind: "link", to: "/pantry", label: "Pantry" },
    {
      kind: "group",
      key: "cook",
      label: "Cook",
      items: [
        { to: "/recipes", label: "Recipes" },
        { to: "/match", label: "What can I cook?" },
      ],
    },
    {
      kind: "group",
      key: "plan",
      label: "Plan",
      items: [
        { to: "/plans", label: "Meal plans" },
        { to: "/shopping", label: "Shopping list" },
      ],
    },
    {
      kind: "group",
      key: "household",
      label: "Household",
      align: "right",
      items: [
        { to: "/people", label: "People" },
        { to: "/settings", label: "Settings" },
        ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
      ],
    },
  ];
}
