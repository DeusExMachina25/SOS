"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getMySessions, getMyPayments } from "@/lib/data/queries";
import { actionCount, buildNotices } from "@/lib/data/notifications";
import type { UnreadThread } from "@/lib/data/unread";
import type { Payment, Session } from "@/lib/data/types";

const REFRESH_MS = 60_000;

/**
 * Lists what needs the user's attention right now (payment due, UPI to
 * confirm, a call about to start, a session to mark completed). It is derived
 * from live sessions and payments, so it needs no read/unread bookkeeping and
 * an item disappears as soon as it is dealt with.
 */
export default function NotificationBell({ role, unreadThreads = [] }: { role: "client" | "expert"; unreadThreads?: UnreadThread[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ sessions: Session[]; payments: Payment[]; at: number }>({ sessions: [], payments: [], at: 0 });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = () => {
    Promise.all([getMySessions(), getMyPayments()])
      .then(([sessions, payments]) => {
        setData({ sessions, payments, at: Date.now() });
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load notifications", err);
        setStatus("error");
      });
  };

  // First load, then a quiet refresh while the dashboard stays open.
  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [role]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Unread messages arrive from the layout's live count, so they update the moment one lands.
  const notices = useMemo(
    () => buildNotices({ role, sessions: data.sessions, payments: data.payments, now: data.at, unread: unreadThreads }),
    [role, data, unreadThreads]
  );
  const count = actionCount(notices);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-label={`Notifications${count ? `, ${count} need${count === 1 ? "s" : ""} your attention` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      >
        <Bell size={14} strokeWidth={1.75} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center bg-[var(--color-orange)] px-1 font-mono-sos text-[8px] text-[var(--bg-base)] tabular-nums">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[92vw] border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <p className="border-b border-[var(--border)] px-4 py-3 font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)]">
            NEEDS YOUR ATTENTION
          </p>

          {status === "loading" && notices.length === 0 && (
            <p className="px-4 py-5 font-mono-sos text-[10px] tracking-[0.15em] text-[var(--text-faint)]">LOADING…</p>
          )}
          {status === "error" && (
            <p className="px-4 py-5 font-mono-sos text-[10px] tracking-[0.15em] text-[var(--color-orange)]">COULDN&apos;T LOAD NOTIFICATIONS. TRY AGAIN SHORTLY.</p>
          )}
          {status === "ready" && notices.length === 0 && (
            <p className="px-4 py-5 font-inter text-[12px] text-[var(--text-muted)]">You&apos;re all caught up.</p>
          )}

          {notices.length > 0 && (
            <ul className="max-h-[360px] overflow-y-auto divide-y divide-[var(--border)]">
              {notices.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-surface-2)]"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${n.tone === "action" ? "bg-[var(--color-orange)]" : "bg-[var(--text-faint)]"}`}
                    />
                    <span className="min-w-0">
                      <span className="block font-inter text-[12px] font-semibold text-[var(--text-primary)]">{n.title}</span>
                      <span className="block truncate font-inter text-[11px] text-[var(--text-muted)]">{n.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
