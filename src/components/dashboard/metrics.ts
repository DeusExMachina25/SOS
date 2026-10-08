export interface TimedValue {
  at: string | null;
  value: number;
}

function monthStart(offset: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

/** Sum of `value` for items falling in the calendar month `offset` months from now (0 = this month, -1 = last). */
export function monthTotal(items: TimedValue[], offset: number): number {
  const from = monthStart(offset).getTime();
  const to = monthStart(offset + 1).getTime();
  return items.reduce((n, it) => {
    if (!it.at) return n;
    const t = new Date(it.at).getTime();
    return t >= from && t < to ? n + it.value : n;
  }, 0);
}

/**
 * Month-over-month change for a StatTile. Returns null when last month has
 * nothing to compare against, so the tile omits the delta instead of
 * showing an invented percentage.
 */
export function monthDelta(items: TimedValue[]): { pct: number; label: string } | null {
  const prev = monthTotal(items, -1);
  if (prev <= 0) return null;
  const cur = monthTotal(items, 0);
  return { pct: Math.round(((cur - prev) / prev) * 100), label: "vs last month" };
}

/** The last `n` calendar months, oldest first, each with its summed value. */
export function lastMonths(items: TimedValue[], n: number): { label: string; value: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const offset = i - (n - 1);
    return {
      label: monthStart(offset).toLocaleDateString("en-US", { month: "short" }),
      value: monthTotal(items, offset),
    };
  });
}

/** "YYYY-MM-DD" in local time, matching generateSlotsForDate's input. */
export function localDateInput(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
