import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { toneBg, type Tone } from "./tones";

export interface ScheduleItem {
  id: string;
  icon: LucideIcon;
  title: string;
  detail?: string;
  /** Right-aligned time or date */
  when?: string;
  href: string;
  tone?: Tone;
}

/** The right column's list of what is coming up: soft rounded rows with an icon chip. */
export default function ScheduleList({ items, empty }: { items: ScheduleItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p className="dash-card border-dashed px-5 py-6 text-center font-mono-sos text-[9px] tracking-[0.2em] text-[var(--text-faint)]">
        {empty}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className={`dash-card group flex items-center gap-4 p-4 transition-colors hover:border-[var(--border-strong)] ${toneBg(item.tone ?? 1)}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--border-strong)] bg-[var(--bg-base)] text-[var(--text-primary)]">
              <item.icon size={16} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-inter text-[13px] font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{item.title}</span>
              {item.detail && (
                <span className="mt-0.5 block font-inter text-[12px] font-light text-[var(--text-muted)] truncate">{item.detail}</span>
              )}
            </span>
            {item.when && (
              <span className="shrink-0 font-mono-sos text-[8px] tracking-[0.15em] text-[var(--text-muted)]">{item.when}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
