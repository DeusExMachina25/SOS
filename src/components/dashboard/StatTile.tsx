"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

export interface StatTileProps {
  /** Small uppercase label above the figure */
  label: string;
  /** The headline figure, already formatted */
  value: string;
  /** Optional unit/noun shown beside the figure ("sessions", "files") */
  unit?: string;
  icon: LucideIcon;
  /**
   * Period-over-period change. Only pass this when it is genuinely
   * computed — a tile with no comparable history omits it rather than
   * inventing one.
   */
  delta?: { pct: number; label: string } | null;
  /** Secondary line under the figure when there is no delta to show */
  note?: string;
}

export default function StatTile({ label, value, unit, icon: Icon, delta, note }: StatTileProps) {
  const rising = (delta?.pct ?? 0) >= 0;
  const Arrow = rising ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="group relative flex flex-col border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition-colors duration-300 hover:border-[var(--border-strong)]">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={13} className="text-[var(--text-faint)] shrink-0" strokeWidth={1.75} />
        <span className="font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)]">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-editorial text-[34px] leading-none text-[var(--text-primary)] tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="font-inter text-xs text-[var(--text-muted)] font-light">{unit}</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 min-h-[16px]">
        {delta ? (
          <>
            <span
              className={`inline-flex items-center gap-1 font-mono-sos text-[10px] tracking-wider ${
                rising ? "text-[var(--color-green)]" : "text-[var(--color-orange)]"
              }`}
            >
              <Arrow size={11} strokeWidth={2} />
              {Math.abs(delta.pct)}%
            </span>
            <span className="font-inter text-[11px] text-[var(--text-faint)] font-light">
              {delta.label}
            </span>
          </>
        ) : (
          note && (
            <span className="font-inter text-[11px] text-[var(--text-faint)] font-light">{note}</span>
          )
        )}
      </div>

      {/* hairline that picks up on hover, echoing the tier panels on Platter */}
      <span className="absolute bottom-0 left-0 h-px w-0 bg-[var(--color-primary)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:w-full" />
    </div>
  );
}
