import { describe, it, expect } from "vitest";
import { monthGrid, shiftMonth, dayKey, isoToDayKey, relativeDay } from "@/lib/data/calendar";

describe("monthGrid", () => {
  it("starts on the Monday on or before the 1st", () => {
    // 1 Nov 2026 is a Sunday, so the grid opens on Mon 26 Oct.
    const grid = monthGrid(2026, 10);
    expect(grid[0]).toEqual({ key: "2026-10-26", day: 26, inMonth: false });
    expect(grid[6]).toEqual({ key: "2026-11-01", day: 1, inMonth: true });
  });

  it("covers whole weeks and every day of the month exactly once", () => {
    const grid = monthGrid(2026, 10);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter((c) => c.inMonth).map((c) => c.day)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1)
    );
  });

  it("needs no padding when the month starts on a Monday", () => {
    // 1 June 2026 is a Monday.
    expect(monthGrid(2026, 5)[0]).toEqual({ key: "2026-06-01", day: 1, inMonth: true });
  });
});

describe("shiftMonth", () => {
  it("wraps across years both ways", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe("day keys", () => {
  it("formats in local time with zero padding", () => {
    expect(dayKey(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("returns null for missing or invalid timestamps", () => {
    expect(isoToDayKey(null)).toBeNull();
    expect(isoToDayKey("not a date")).toBeNull();
  });
});

describe("relativeDay", () => {
  const now = new Date(2026, 10, 13, 9, 0);
  it("names today, tomorrow and yesterday", () => {
    expect(relativeDay(new Date(2026, 10, 13, 18, 0).toISOString(), now)).toBe("Today");
    expect(relativeDay(new Date(2026, 10, 14, 8, 0).toISOString(), now)).toBe("Tomorrow");
    expect(relativeDay(new Date(2026, 10, 12, 8, 0).toISOString(), now)).toBe("Yesterday");
  });
  it("falls back to a short date, and to empty for no date", () => {
    expect(relativeDay(new Date(2026, 10, 20, 8, 0).toISOString(), now)).toMatch(/20/);
    expect(relativeDay(null, now)).toBe("");
  });
});
