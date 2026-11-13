"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import ArrowChip from "./ArrowChip";
import { toneBg, type Tone } from "./tones";

export interface StatTileProps {
  /** Small label above the figure */
  label: string;
  /** The headline figure, already formatted */
  value: string;
  /** Optional unit/noun shown beside the figure ("sessions", "files") */
  unit?: string;
  icon?: LucideIcon;
  /**
   * Period-over-period change. Only pass this when it is genuinely
   * computed — a tile with no comparable history omits it rather than
   * inventing one.
   */
  delta?: { pct: number; label: string } | null;
  /** Secondary line under the figure when there is no delta to show */
  note?: string;
  /** Card fill. Defaults to the neutral surface. */
  tone?: Tone;
  /** When set, the corner arrow links here */
  href?: string;
  /** Draws attention to the tile, e.g. payments waiting on you */
  highlight?: boolean;
}

/** A coloured figure tile with an arrow to its page — the reference's "Completed 18 ↗". */
export default function StatTile({ label, value, unit, icon: Icon, delta, note, tone = "plain", href, highlight }: StatTileProps) {
  const rising = (delta?.pct ?? 0) >= 0;
  const Arrow = rising ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={`dash-card relative flex flex-col p-5 ${toneBg(tone)} ${highlight ? "!border-[var(--color-primary)]" : ""}`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.75} />}
        <span className="font-mono-sos text-[9px] tracking-[0.22em] text-[var(--text-muted)]">{label}</span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-editorial text-[40px] leading-none text-[var(--text-primary)] tracking-tight tabular-nums truncate">
            {value}
          </span>
          {unit && <span className="font-inter text-xs text-[var(--text-muted)] font-light">{unit}</span>}
        </div>
        {href && <ArrowChip label={`Open ${label.toLowerCase()}`} href={href} />}
      </div>

      <div className="mt-3 flex items-center gap-2 min-h-[16px]">
        {delta ? (
          <>
            <span className="inline-flex items-center gap-1 font-mono-sos text-[10px] tracking-wider text-[var(--text-primary)]">
              <Arrow size={11} strokeWidth={2} />
              {Math.abs(delta.pct)}%
            </span>
            <span className="font-inter text-[11px] text-[var(--text-muted)] font-light">{delta.label}</span>
          </>
        ) : (
          note && <span className="font-inter text-[11px] text-[var(--text-muted)] font-light">{note}</span>
        )}
      </div>
    </div>
  );
}
