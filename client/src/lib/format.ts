import type { Listed, Ref, Unit } from "./types";

export const UNITS: { value: Unit; label: string }[] = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "tsp", label: "tsp" },
  { value: "tbsp", label: "tbsp" },
  { value: "fl_oz", label: "fl oz" },
  { value: "cup", label: "cup" },
  { value: "pinch", label: "pinch" },
  { value: "piece", label: "piece" },
];

export const unitLabel = (u: string): string => UNITS.find((x) => x.value === u)?.label ?? u;

export const LOCATIONS = [
  { value: "pantry", label: "Pantry" },
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
] as const;

export function asList<T>(body: Listed<T> | undefined | null): T[] {
  if (!body) return [];
  return Array.isArray(body) ? body : (body.items ?? []);
}

/** The id from either "abc" or { _id: "abc", ... }. */
export function refId(ref: Ref): string {
  return typeof ref === "string" ? ref : String(ref._id);
}

/** The name when the API populated it, otherwise undefined. */
export function refName(ref: Ref): string | undefined {
  return typeof ref === "string" ? undefined : ref.name;
}

/** 2.5, 100, 0.33: at most two decimals, no trailing zeros. */
export function formatQty(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Today in the user's own time zone as YYYY-MM-DD (the server can't know it). */
export function localToday(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function dayNumber(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86_400_000);
}

/** Whole days from `today` to `date`: 0 is today, negative is in the past. */
export function daysUntil(date: string, today: string = localToday()): number {
  return dayNumber(date) - dayNumber(today);
}

export type ExpiryTone = "none" | "ok" | "soon" | "expired";

export function expiryInfo(date: string | null | undefined, today: string = localToday()): { text: string; tone: ExpiryTone } {
  if (!date) return { text: "No expiry", tone: "none" };
  const d = daysUntil(date, today);
  if (d < 0) return { text: d === -1 ? "Expired yesterday" : `Expired ${-d} days ago`, tone: "expired" };
  if (d === 0) return { text: "Expires today", tone: "soon" };
  if (d === 1) return { text: "Expires tomorrow", tone: "soon" };
  if (d <= 3) return { text: `Expires in ${d} days`, tone: "soon" };
  return { text: `Expires ${date.slice(0, 10)}`, tone: "ok" };
}

/** "1 cup" / "2 piece" style amount. */
export function amount(quantity: number, unit: string): string {
  return `${formatQty(quantity)} ${unitLabel(unit)}`;
}

const parseDay = (d: string): Date => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1));
};
const fmtDay = (dt: Date): string => dt.toISOString().slice(0, 10);

/** "2026-10-26" plus n days, calendar arithmetic with no time-zone drift. */
export function addDays(date: string, n: number): string {
  const dt = parseDay(date);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmtDay(dt);
}

/** Every day from start to end inclusive. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 70; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "Mon, Oct 26" */
export function dayLabel(date: string): string {
  return parseDay(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export const MEAL_SLOTS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;
