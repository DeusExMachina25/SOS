"use client";

import type { Session } from "@/lib/data/types";

/** The expert's distinct clients with session counts and each client's next booking. */
export default function ClientRoster({ sessions }: { sessions: Session[] }) {
  const byClient = new Map<string, { name: string; count: number; next?: Session }>();
  for (const sess of sessions) {
    if (sess.status === "cancelled") continue;
    const entry = byClient.get(sess.clientId) ?? { name: sess.clientName, count: 0 };
    entry.count += 1;
    if (sess.status === "scheduled" && (!entry.next || (sess.startsAt ?? "") < (entry.next.startsAt ?? ""))) {
      entry.next = sess;
    }
    byClient.set(sess.clientId, entry);
  }
  const clients = [...byClient.values()];

  if (clients.length === 0) {
    return (
      <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)] py-4">No bookings yet</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)] border border-[var(--border)] max-h-[320px] overflow-y-auto scrollbar-thin">
      {clients.map((c) => (
        <li key={c.name} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-inter text-xs font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
            <p className="font-mono-sos text-[9px] tracking-wider text-[var(--text-faint)] truncate mt-0.5">
              {c.next ? `Next: ${c.next.date} • ${c.next.time}` : "No upcoming session"}
            </p>
          </div>
          <span className="font-mono-sos text-[9px] tracking-wider text-[var(--text-muted)] shrink-0">
            {c.count} {c.count === 1 ? "session" : "sessions"}
          </span>
        </li>
      ))}
    </ul>
  );
}
