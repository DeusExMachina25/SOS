/**
 * Pure date maths for the dashboard's month calendar. No React, so it is
 * unit-tested directly (src/__tests__/calendar.test.ts).
 *
 * Weeks start on Monday, the norm in India and most of the world.
 */

export interface CalendarDay {
  /** "YYYY-MM-DD" in local time */
  key: string;
  /** Day of the month, 1–31 */
  day: number;
  /** False for the leading and trailing days borrowed from the next/previous month */
  inMonth: boolean;
}

/** "YYYY-MM-DD" for a Date in local time. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Local-time key for an ISO timestamp, or null when it is missing or unreadable. */
export function isoToDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : dayKey(d);
}

/**
 * Every cell of a month view: whole weeks, Monday first, padded with days
 * from the neighbouring months. Always 5 or 6 rows of 7.
 *
 * @param year  full year, e.g. 2026
 * @param month 0-based month, as Date uses (0 = January)
 */
export function monthGrid(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  // getDay(): 0 = Sunday. Shift so Monday = 0.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;

  return Array.from({ length: cells }, (_, i) => {
    const d = new Date(year, month, 1 - lead + i);
    return { key: dayKey(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

/** Moves a {year, month} pair by `delta` months, wrapping the year. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/**
 * A short label for when something happens: "Today", "Tomorrow",
 * "Yesterday", or a date like "18 Nov". `now` is injectable for tests.
 */
export function relativeDay(iso: string | null | undefined, now: Date = new Date()): string {
  const key = isoToDayKey(iso);
  if (!key) return "";
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offsets: Record<string, string> = {
    [dayKey(base)]: "Today",
    [dayKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1))]: "Tomorrow",
    [dayKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1))]: "Yesterday",
  };
  return offsets[key] ?? new Date(iso as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
