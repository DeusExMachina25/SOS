import { describe, it, expect } from "vitest";
import { generateSlotsForDate } from "@/lib/data/slots";
import type { AvailabilityRule } from "@/lib/data/types";

const rule = (weekday: number, startTime: string, endTime: string): AvailabilityRule => ({
  id: "r",
  expertId: "e",
  weekday,
  startTime,
  endTime,
});

/** A Monday far enough ahead that "today" and "past" never interfere. */
function futureMonday() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}
const asInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("generateSlotsForDate", () => {
  const monday = futureMonday();
  const date = asInput(monday);

  it("lists hourly slots inside a rule", () => {
    expect(generateSlotsForDate(date, [rule(1, "09:00", "17:00")], [], 60)).toHaveLength(8);
  });

  it("removes a slot that overlaps a booking", () => {
    const start = new Date(monday);
    start.setHours(12, 0, 0, 0);
    const busy = [{ startsAt: start.toISOString(), endsAt: new Date(+start + 3600_000).toISOString() }];
    const slots = generateSlotsForDate(date, [rule(1, "09:00", "17:00")], busy, 60);
    expect(slots).toHaveLength(7);
    expect(slots).not.toContain("12:00 PM");
  });

  it("returns nothing for a day with no rule, no rules, a bad date or an inverted rule", () => {
    expect(generateSlotsForDate(date, [rule(2, "09:00", "17:00")], [], 60)).toEqual([]);
    expect(generateSlotsForDate(date, [], [], 60)).toEqual([]);
    expect(generateSlotsForDate("", [rule(1, "09:00", "17:00")], [], 60)).toEqual([]);
    expect(generateSlotsForDate(date, [rule(1, "17:00", "09:00")], [], 60)).toEqual([]);
  });

  it("does not list the same time twice when rules overlap", () => {
    const slots = generateSlotsForDate(date, [rule(1, "09:00", "12:00"), rule(1, "11:00", "14:00")], [], 60);
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toEqual(["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM"]);
  });
});
