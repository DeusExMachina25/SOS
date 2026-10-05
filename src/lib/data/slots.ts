/**
 * Turns an expert's weekly availability rules + existing bookings into a
 * list of real, bookable time slots for one calendar date.
 */

import type { AvailabilityRule, BusyRange } from "./types";

/** Parses "2026-10-24" as a LOCAL date (not UTC) to match rule weekdays. */
function parseDateLocal(dateInput: string): Date | null {
  const [year, month, day] = dateInput.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatSlotLabel(hour: number, minute: number): string {
  const meridiem = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${meridiem}`;
}

/**
 * Bookable start times (e.g. "10:00 AM") for `dateInput`, derived from the
 * rules matching that weekday, minus any slot overlapping a busy range, minus
 * past times if the date is today.
 */
export function generateSlotsForDate(
  dateInput: string,
  rules: AvailabilityRule[],
  busyRanges: BusyRange[],
  slotMinutes = 60
): string[] {
  const date = parseDateLocal(dateInput);
  if (!date) return [];

  const weekday = date.getDay();
  const dayRules = rules.filter((r) => r.weekday === weekday);
  if (dayRules.length === 0) return [];

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const busy = busyRanges.map((b) => ({
    start: new Date(b.startsAt).getTime(),
    end: new Date(b.endsAt).getTime(),
  }));

  const slots: { label: string; start: number }[] = [];

  for (const rule of dayRules) {
    const [startHour, startMinute] = rule.startTime.split(":").map(Number);
    const [endHour, endMinute] = rule.endTime.split(":").map(Number);

    let cursor = new Date(date);
    cursor.setHours(startHour, startMinute, 0, 0);
    const ruleEnd = new Date(date);
    ruleEnd.setHours(endHour, endMinute, 0, 0);

    while (cursor.getTime() + slotMinutes * 60000 <= ruleEnd.getTime()) {
      const slotStart = cursor.getTime();
      const slotEnd = slotStart + slotMinutes * 60000;

      const isPast = isToday && slotStart <= now.getTime();
      const overlapsBusy = busy.some((b) => slotStart < b.end && slotEnd > b.start);

      if (!isPast && !overlapsBusy) {
        slots.push({
          label: formatSlotLabel(cursor.getHours(), cursor.getMinutes()),
          start: slotStart,
        });
      }

      cursor = new Date(cursor.getTime() + slotMinutes * 60000);
    }
  }

  return slots.sort((a, b) => a.start - b.start).map((s) => s.label);
}

/** Today's date as "YYYY-MM-DD", for date-input min/default. */
export function todayDateInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}
