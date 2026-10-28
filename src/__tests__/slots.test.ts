import { describe, it, expect } from "vitest";
import {
  generateSlotsForDate,
  dayBoundsUtc,
  dateInputInZone,
  addDaysToDateInput,
  resolveTimeZone,
  isValidTimeZone,
  canonicalTimeZone,
  COMMON_TIME_ZONES,
  describeTimeZone,
  DEFAULT_EXPERT_TIMEZONE,
} from "@/lib/data/slots";
import type { AvailabilityRule } from "@/lib/data/types";

const rule = (weekday: number, startTime: string, endTime: string): AvailabilityRule => ({
  id: "r",
  expertId: "e",
  weekday,
  startTime,
  endTime,
});

// 2026-11-02 is a Monday. A fixed "now" long before it keeps the past filter out of the way.
const MONDAY = "2026-11-02";
const LONG_AGO = Date.UTC(2026, 0, 1);
const KOLKATA = "Asia/Kolkata";
const NINE_TO_FIVE = [rule(1, "09:00", "17:00")];

const slotsFor = (date: string, rules: AvailabilityRule[], tz: string | null, busy: { startsAt: string; endsAt: string }[] = [], now = LONG_AGO) =>
  generateSlotsForDate(date, rules, busy, 60, tz, now);

describe("generateSlotsForDate: the expert's clock", () => {
  it("lists hourly slots inside a rule, labelled in the expert's time", () => {
    const slots = slotsFor(MONDAY, NINE_TO_FIVE, KOLKATA);
    expect(slots).toHaveLength(8);
    expect(slots[0].label).toBe("9:00 AM");
    expect(slots[7].label).toBe("4:00 PM");
  });

  it("turns 9:00 expert time into the right absolute instant, whatever timezone it runs in", () => {
    // India is UTC+5:30 with no DST.
    expect(slotsFor(MONDAY, NINE_TO_FIVE, KOLKATA)[0].startsAt).toBe("2026-11-02T03:30:00.000Z");
    // New York is on standard time (UTC-5) on 2 Nov 2026...
    expect(slotsFor(MONDAY, NINE_TO_FIVE, "America/New_York")[0].startsAt).toBe("2026-11-02T14:00:00.000Z");
    // ...and on daylight time (UTC-4) on 9 Mar 2026, the day after the clocks went forward.
    expect(slotsFor("2026-03-09", NINE_TO_FIVE, "America/New_York")[0].startsAt).toBe("2026-03-09T13:00:00.000Z");
    expect(slotsFor("2026-03-02", NINE_TO_FIVE, "America/New_York")[0].startsAt).toBe("2026-03-02T14:00:00.000Z");
  });

  it("uses a slot's end as start plus its length", () => {
    const [first] = slotsFor(MONDAY, NINE_TO_FIVE, KOLKATA);
    expect(new Date(first.endsAt).getTime() - new Date(first.startsAt).getTime()).toBe(3600_000);
  });

  it("reads the weekday from the calendar date, not from the viewer's timezone", () => {
    // Monday 00:30 in Kolkata is still Sunday in UTC and in New York.
    const slots = slotsFor(MONDAY, [rule(1, "00:30", "02:30")], KOLKATA);
    expect(slots.map((s) => s.label)).toEqual(["12:30 AM", "1:30 AM"]);
  });

  it("removes a slot that overlaps a booking, matched on instants", () => {
    // 12:00-13:00 India is 06:30-07:30 UTC.
    const busy = [{ startsAt: "2026-11-02T06:30:00.000Z", endsAt: "2026-11-02T07:30:00.000Z" }];
    const slots = slotsFor(MONDAY, NINE_TO_FIVE, KOLKATA, busy);
    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.label)).not.toContain("12:00 PM");
  });

  it("drops slots that have already started", () => {
    const now = Date.parse("2026-11-02T06:45:00.000Z"); // 12:15 in Kolkata
    const slots = slotsFor(MONDAY, NINE_TO_FIVE, KOLKATA, [], now);
    expect(slots.map((s) => s.label)).toEqual(["1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"]);
  });

  it("returns nothing for a day with no rule, no rules, a bad date or an inverted rule", () => {
    expect(slotsFor(MONDAY, [rule(2, "09:00", "17:00")], KOLKATA)).toEqual([]);
    expect(slotsFor(MONDAY, [], KOLKATA)).toEqual([]);
    expect(slotsFor("", NINE_TO_FIVE, KOLKATA)).toEqual([]);
    expect(slotsFor("not-a-date", NINE_TO_FIVE, KOLKATA)).toEqual([]);
    expect(slotsFor(MONDAY, [rule(1, "17:00", "09:00")], KOLKATA)).toEqual([]);
  });

  it("does not list the same time twice when rules overlap", () => {
    const slots = slotsFor(MONDAY, [rule(1, "09:00", "12:00"), rule(1, "11:00", "14:00")], KOLKATA);
    expect(slots.map((s) => s.label)).toEqual(["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM"]);
  });

  it("falls back to the default timezone when the expert has none or a garbled one", () => {
    const expected = slotsFor(MONDAY, NINE_TO_FIVE, DEFAULT_EXPERT_TIMEZONE)[0].startsAt;
    expect(slotsFor(MONDAY, NINE_TO_FIVE, null)[0].startsAt).toBe(expected);
    expect(slotsFor(MONDAY, NINE_TO_FIVE, "Not/AZone")[0].startsAt).toBe(expected);
    expect(resolveTimeZone("")).toBe(DEFAULT_EXPERT_TIMEZONE);
  });

  it("always gives the viewer's equivalent as a string or null, never undefined", () => {
    for (const s of slotsFor(MONDAY, NINE_TO_FIVE, "Pacific/Auckland")) {
      expect(s.viewerLabel === null || typeof s.viewerLabel === "string").toBe(true);
    }
  });
});

describe("date helpers", () => {
  it("bounds a calendar day on the expert's clock", () => {
    expect(dayBoundsUtc(MONDAY, KOLKATA)).toEqual({ from: "2026-11-01T18:30:00.000Z", to: "2026-11-02T18:30:00.000Z" });
    expect(dayBoundsUtc("", KOLKATA)).toBeNull();
  });

  it("makes a day 23 or 25 hours long across a clock change", () => {
    const len = (d: string) => {
      const b = dayBoundsUtc(d, "America/New_York")!;
      return (Date.parse(b.to) - Date.parse(b.from)) / 3600_000;
    };
    expect(len("2026-03-08")).toBe(23); // spring forward
    expect(len("2026-11-01")).toBe(25); // fall back
    expect(len("2026-11-02")).toBe(24);
  });

  it("names the calendar date at an instant in a given zone", () => {
    const ts = Date.UTC(2026, 10, 1, 20, 0); // 1 Nov, 20:00 UTC
    expect(dateInputInZone(ts, KOLKATA)).toBe("2026-11-02"); // 01:30 next day in India
    expect(dateInputInZone(ts, "America/New_York")).toBe("2026-11-01");
  });

  it("adds days across month and year ends", () => {
    expect(addDaysToDateInput("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysToDateInput("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateInput("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("describes a zone for display", () => {
    expect(describeTimeZone(KOLKATA)).toContain("Asia/Kolkata");
    expect(describeTimeZone(null)).toContain("Asia/Kolkata");
  });
});

describe("timezone validation", () => {
  it("accepts real zones and rejects everything else", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("America/Los_Angeles")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    for (const bad of ["", null, undefined, "Not/AZone", "IST", "EST", "PST", "+05:30", "GMT+5:30 nonsense", "../etc/passwd"]) {
      expect(isValidTimeZone(bad as string | null | undefined)).toBe(false);
    }
  });

  it("rewrites a zone to its canonical spelling", () => {
    expect(canonicalTimeZone("asia/kolkata")).toBe("Asia/Kolkata");
    expect(canonicalTimeZone("America/New_York")).toBe("America/New_York");
  });

  it("every zone offered in the picker is valid and produces slots", () => {
    for (const zone of COMMON_TIME_ZONES) {
      expect(isValidTimeZone(zone), zone).toBe(true);
      expect(slotsFor(MONDAY, NINE_TO_FIVE, zone), zone).toHaveLength(8);
    }
  });
});
