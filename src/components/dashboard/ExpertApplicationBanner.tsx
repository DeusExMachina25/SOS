"use client";

import Link from "next/link";
import { applicationNotice } from "@/lib/data/invite";
import type { ExpertStatus } from "@/lib/data/types";

const TONE: Record<"action" | "info" | "warn", string> = {
  action: "border-[var(--color-primary)] bg-[var(--color-primary)]/10",
  info: "border-[var(--border-strong)] bg-[var(--bg-surface)]",
  warn: "border-[var(--color-orange)]/50 bg-[var(--color-orange)]/10",
};

/** Tells an expert where their application stands, across the top of their dashboard, until they are approved. */
export default function ExpertApplicationBanner({ status }: { status: ExpertStatus | null }) {
  const notice = applicationNotice(status);
  if (!notice) return null;

  return (
    <div role="status" className={`mb-5 flex flex-wrap items-center justify-between gap-3 border px-5 py-4 ${TONE[notice.tone]}`}>
      <p className="font-inter text-sm text-[var(--text-primary)]">{notice.text}</p>
      {notice.cta && (
        <Link
          href={notice.cta.href}
          className="shrink-0 border border-[var(--color-primary)] px-4 py-2 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-2)]"
        >
          {notice.cta.label.toUpperCase()}
        </Link>
      )}
    </div>
  );
}
