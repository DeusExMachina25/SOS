"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid, shiftMonth, dayKey, WEEKDAY_LABELS } from "@/lib/data/calendar";

interface MiniCalendarProps {
  /** Day keys ("YYYY-MM-DD") that have a session */
  sessionDays: Set<string>;
  /** Day keys with a payment still due */
  dueDays?: Set<string>;
  /** Shown under the grid so the marks are readable without colour alone */
  legend?: { session: string; due?: string };
}

/**
 * Month calendar for the dashboard's right column. Today is solid, session
 * days are tinted, days with money due get a dashed outline. Day cells are
 * square chips inside a rounded card.
 */
export default function MiniCalendar({ sessionDays, dueDays = new Set(), legend }: MiniCalendarProps) {
  const now = new Date();
  const todayKey = dayKey(now);
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const grid = useMemo(() => monthGrid(view.year, view.month), [view]);
  const title = new Date(view.year, view.month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const navBtn =
    "flex h-8 w-8 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--text-primary)]";

  return (
    <div className="dash-card bg-[var(--tint-plain)] p-5">
      <div className="flex items-center justify-between">
        <p className="font-editorial text-xl text-[var(--text-primary)]" aria-live="polite">{title}</p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous month" className={navBtn} onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}>
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
          <button type="button" aria-label="Next month" className={navBtn} onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}>
            <ChevronRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center" role="grid" aria-label={title}>
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} role="columnheader" className="pb-2 font-mono-sos text-[8px] tracking-[0.15em] text-[var(--text-faint)]">
            {d}
          </span>
        ))}
        {grid.map((cell) => {
          const isToday = cell.key === todayKey;
          const hasSession = sessionDays.has(cell.key);
          const isDue = dueDays.has(cell.key);
          const state = isToday
            ? "bg-[var(--color-primary)] text-[var(--bg-base)] border-transparent"
            : hasSession
            ? "bg-[var(--tint-2)] text-[var(--text-primary)] border-transparent"
            : "border-transparent";
          const label = [
            new Date(`${cell.key}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
            isToday && "today",
            hasSession && "session booked",
            isDue && "payment due",
          ].filter(Boolean).join(", ");
          return (
            <span
              key={cell.key}
              role="gridcell"
              aria-label={label}
              className={`mx-auto flex h-9 w-9 items-center justify-center border font-inter text-[13px] tabular-nums ${state} ${
                isDue ? "!border-dashed !border-[var(--text-muted)]" : ""
              } ${cell.inMonth ? "" : "opacity-35"}`}
            >
              {cell.day}
            </span>
          );
        })}
      </div>

      {legend && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono-sos text-[8px] tracking-[0.18em] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-[var(--color-primary)]" /> Today</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-[var(--tint-2)] border border-[var(--border-strong)]" /> {legend.session}</span>
          {legend.due && (
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 border border-dashed border-[var(--text-muted)]" /> {legend.due}</span>
          )}
        </div>
      )}
    </div>
  );
}
