"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface PanelProps {
  title: string;
  /** Small uppercase line under the title */
  subtitle?: string;
  /** Right-hand control slot — a period selector, a toggle, a count */
  action?: React.ReactNode;
  /** When set, the corner arrow becomes a link to this route */
  href?: string;
  className?: string;
  /** Removes the body padding, for panels whose child owns its own edges */
  flush?: boolean;
  children: React.ReactNode;
}

/**
 * The dashboard's panel chrome: a titled, hard-edged surface.
 *
 * Deliberately square — the brutalist edge treatment the marketing pages
 * use — rather than the rounded cards of a typical SaaS console.
 */
export default function Panel({
  title,
  subtitle,
  action,
  href,
  className = "",
  flush = false,
  children
}: PanelProps) {
  return (
    <section
      className={`flex flex-col border border-[var(--border)] bg-[var(--bg-surface)] ${className}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 shrink-0">
        <div className="min-w-0">
          <h2 className="font-editorial text-lg text-[var(--text-primary)] tracking-tight leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)] mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {action}
          {href && (
            <Link
              href={href}
              aria-label={`Open ${title}`}
              className="flex h-7 w-7 items-center justify-center border border-[var(--border)] text-[var(--text-faint)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <ArrowUpRight size={13} strokeWidth={1.75} />
            </Link>
          )}
        </div>
      </header>

      <div className={`flex-1 min-h-0 ${flush ? "" : "p-5"}`}>{children}</div>
    </section>
  );
}
