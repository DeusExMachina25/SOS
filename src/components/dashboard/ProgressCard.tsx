import React from "react";
import type { LucideIcon } from "lucide-react";
import ArrowChip from "./ArrowChip";
import { toneBg, type Tone } from "./tones";

export interface ProgressBar {
  label: string;
  /** 0–100 */
  pct: number;
}

interface ProgressCardProps {
  tone: Tone;
  icon: LucideIcon;
  /** Small label beside the icon, e.g. the expert's title */
  category: string;
  /** Count line above the title, e.g. "3 of 5 sessions" */
  meta: string;
  title: string;
  bars: ProgressBar[];
  href?: string;
}

/**
 * An engagement card with progress bars. Built generic on purpose: the
 * same card can later show a budget ("₹4.2L of ₹6L spent").
 */
export default function ProgressCard({ tone, icon: Icon, category, meta, title, bars, href }: ProgressCardProps) {
  return (
    <article className={`dash-card p-5 sm:p-6 ${toneBg(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--border-strong)] bg-[var(--bg-base)] text-[var(--text-primary)]">
            <Icon size={16} strokeWidth={1.75} />
          </span>
          <span className="font-inter text-sm text-[var(--text-primary)] truncate">{category}</span>
        </div>
        {href && <ArrowChip label={`Open ${title}`} href={href} />}
      </div>

      <p className="mt-5 font-mono-sos text-[9px] tracking-[0.2em] text-[var(--text-muted)]">{meta}</p>
      <h3 className="mt-1.5 font-editorial text-[24px] leading-tight tracking-tight text-[var(--text-primary)] truncate">{title}</h3>

      <div className="mt-4 space-y-3">
        {bars.map((bar) => {
          const pct = Math.max(0, Math.min(100, Math.round(bar.pct)));
          return (
            <div key={bar.label}>
              <div className="flex justify-between font-mono-sos text-[8px] tracking-[0.2em] text-[var(--text-muted)] mb-1.5">
                <span>{bar.label}</span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <div
                className="h-1.5 w-full bg-[var(--tint-track)] overflow-hidden"
                role="progressbar"
                aria-label={bar.label}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="dash-bar-fill h-full bg-[var(--text-primary)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
