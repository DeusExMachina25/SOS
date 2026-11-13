import React from "react";
import ArrowChip from "./ArrowChip";
import AvatarStack from "./AvatarStack";
import { toneBg, type Tone } from "./tones";

interface TodayCardProps {
  tone: Tone;
  /** Small line above the title, e.g. the time */
  eyebrow?: string;
  title: string;
  /** Short status in the top-right chip, e.g. "Paid" or "In 2h" */
  status?: string;
  /** People on this item, drawn as an initials stack */
  people?: string[];
  /** What the arrow does */
  actionLabel: string;
  href?: string;
  onAction?: () => void;
}

/** One of the large "Today" cards: what needs you right now. */
export default function TodayCard({ tone, eyebrow, title, status, people = [], actionLabel, href, onAction }: TodayCardProps) {
  return (
    <article className={`dash-card relative flex min-h-[176px] flex-col justify-between p-5 sm:p-6 ${toneBg(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        {eyebrow ? (
          <p className="font-mono-sos text-[9px] tracking-[0.22em] text-[var(--text-muted)]">{eyebrow}</p>
        ) : <span />}
        {status && (
          <span className="shrink-0 border border-[var(--border-strong)] bg-[var(--bg-base)] px-2.5 py-1 font-mono-sos text-[9px] tracking-[0.18em] text-[var(--text-primary)]">
            {status}
          </span>
        )}
      </div>

      <div className="mt-6">
        <AvatarStack names={people} />
        <div className="mt-3 flex items-end justify-between gap-4">
          <h3 className="font-editorial text-[22px] sm:text-[26px] leading-[1.1] tracking-tight text-[var(--text-primary)] line-clamp-2">
            {title}
          </h3>
          <ArrowChip label={actionLabel} href={href} onClick={onAction} />
        </div>
      </div>
    </article>
  );
}
