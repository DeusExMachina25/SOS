/**
 * Turns an expert's weekly availability rules + existing bookings into a
 * list of real, bookable time slots for one calendar date.
 *
 * Availability rules ("Mondays 09:00-17:00") are wall-clock times in the
 * EXPERT's timezone, and so is the calendar date being asked about. Slots are
 * returned as absolute instants (`startsAt`, ISO UTC) so booking never has to
 * re-parse a label, plus a label in the expert's time and, when the viewer is
 * in a different timezone, their own equivalent.
 */

import type { AvailabilityRule, BusyRange } from "./types";

/** Used when an expert has not set a timezone (the platform prices in INR and onboards India-based experts). */
export const DEFAULT_EXPERT_TIMEZONE = "Asia/Kolkata";

export interface Slot {
  /** Start time in the expert's timezone, e.g. "9:00 AM". */
  label: string;
  /** Absolute start, ISO 8601 UTC. This is what gets booked. */
  startsAt: string;
  endsAt: string;
  /** The same start in the viewer's timezone (e.g. "5:30 AM"), or null when it reads the same. */
  viewerLabel: string | null;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string | undefined, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone ?? "local"}|${JSON.stringify(opts)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { ...opts, ...(timeZone ? { timeZone } : {}) });
    formatters.set(key, f);
  }
  return f;
}

/** A valid IANA zone, or the default when missing/garbled (a bad stored value must not break booking). */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return DEFAULT_EXPERT_TIMEZONE;
  try {
    formatter(timeZone, { hour: "numeric" });
    return timeZone;
  } catch {
    return DEFAULT_EXPERT_TIMEZONE;
  }
}

/** How far `timeZone` is ahead of UTC at instant `ts`, in ms. */
function offsetMs(ts: number, timeZone: string): number {
  const parts = formatter(timeZone, {
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** The instant at which the wall clock in `timeZone` reads y-m-d hh:mm. */
function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): number {
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // First pass uses the offset at the naive instant; the second re-reads it at
  // the result so a date that straddles a DST change lands on the right side.
  const first = naive - offsetMs(naive, timeZone);
  return naive - offsetMs(first, timeZone);
}

function parseDate(dateInput: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = dateInput.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/** "9:00 AM" for instant `ts` in `timeZone` (undefined = the viewer's own). Built by hand: newer ICU puts a narrow no-break space before AM/PM. */
function clockLabel(ts: number, timeZone: string | undefined): string {
  const parts = formatter(timeZone, { hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
}

function calendarKey(ts: number, timeZone: string | undefined): string {
  return formatter(timeZone, { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(ts));
}

/** Viewer-side label, with a day hint when their calendar date differs from the expert's. */
function viewerLabelFor(ts: number, expertZone: string): string | null {
  const viewer = clockLabel(ts, undefined);
  const sameClock = viewer === clockLabel(ts, expertZone);
  const expertDay = calendarKey(ts, expertZone);
  const viewerDay = calendarKey(ts, undefined);
  if (viewerDay === expertDay) return sameClock ? null : viewer;
  const viewerIsAhead = new Date(viewerDay).getTime() > new Date(expertDay).getTime();
  return `${viewer} (${viewerIsAhead ? "next" : "previous"} day)`;
}

/**
 * The window [start, end) of calendar date `dateInput` in the expert's
 * timezone, as ISO instants — what to ask the database for busy ranges.
 */
export function dayBoundsUtc(dateInput: string, timeZone: string | null | undefined): { from: string; to: string } | null {
  const date = parseDate(dateInput);
  if (!date) return null;
  const zone = resolveTimeZone(timeZone);
  const from = zonedTimeToUtc(date.y, date.m, date.d, 0, 0, zone);
  const to = zonedTimeToUtc(date.y, date.m, date.d + 1, 0, 0, zone);
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

/** The calendar date ("YYYY-MM-DD") it is at instant `ts` in `timeZone`. */
export function dateInputInZone(ts: number, timeZone: string | null | undefined): string {
  const parts = formatter(resolveTimeZone(timeZone), { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Calendar arithmetic on a "YYYY-MM-DD" string (no timezone involved). */
export function addDaysToDateInput(dateInput: string, days: number): string {
  const date = parseDate(dateInput);
  if (!date) return dateInput;
  return new Date(Date.UTC(date.y, date.m - 1, date.d + days)).toISOString().slice(0, 10);
}

/** e.g. "Asia/Kolkata (GMT+5:30)" for showing which clock the times are on. */
export function describeTimeZone(timeZone: string | null | undefined): string {
  const zone = resolveTimeZone(timeZone);
  const name = formatter(zone, { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return name ? `${zone.replace(/_/g, " ")} (${name})` : zone;
}

/**
 * Bookable start times for calendar date `dateInput` (in the expert's
 * timezone): the rules matching that weekday, minus any slot overlapping a
 * busy range, minus anything already in the past.
 */
export function generateSlotsForDate(
  dateInput: string,
  rules: AvailabilityRule[],
  busyRanges: BusyRange[],
  slotMinutes = 60,
  timeZone?: string | null,
  now: number = Date.now()
): Slot[] {
  const date = parseDate(dateInput);
  if (!date || slotMinutes <= 0) return [];

  const zone = resolveTimeZone(timeZone);
  // The weekday of a calendar date does not depend on any timezone.
  const weekday = new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
  const dayRules = rules.filter((r) => r.weekday === weekday);
  if (dayRules.length === 0) return [];

  const busy = busyRanges.map((b) => ({
    start: new Date(b.startsAt).getTime(),
    end: new Date(b.endsAt).getTime(),
  }));
  const step = slotMinutes * 60_000;
  const starts = new Set<number>();

  for (const rule of dayRules) {
    const [startHour, startMinute] = rule.startTime.split(":").map(Number);
    const [endHour, endMinute] = rule.endTime.split(":").map(Number);
    const ruleStart = zonedTimeToUtc(date.y, date.m, date.d, startHour, startMinute, zone);
    const ruleEnd = zonedTimeToUtc(date.y, date.m, date.d, endHour, endMinute, zone);

    for (let start = ruleStart; start + step <= ruleEnd; start += step) {
      const end = start + step;
      if (start <= now) continue;
      if (busy.some((b) => start < b.end && end > b.start)) continue;
      starts.add(start); // a Set: two overlapping rules (9-12 and 11-14) must not list 11:00 twice
    }
  }

  return [...starts]
    .sort((a, b) => a - b)
    .map((start) => ({
      label: clockLabel(start, zone),
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(start + step).toISOString(),
      viewerLabel: viewerLabelFor(start, zone),
    }));
}

/** Today's date as "YYYY-MM-DD" in the viewer's timezone, for date-input min/default. */
export function todayDateInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}
