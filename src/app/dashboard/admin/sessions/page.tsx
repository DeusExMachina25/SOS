"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { getMySessions } from "@/lib/data/queries";
import { recordRefund } from "@/lib/data/admin";
import { canRefund, refundWarning } from "@/lib/data/adminRules";
import { formatInr } from "@/lib/data/format";
import type { PaymentStatus, Session } from "@/lib/data/types";

type Filter = "all" | "paid" | "unpaid" | "refunded";

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  escrow_held: "Paid · held",
  released: "Paid · direct to expert",
  refunded: "Refunded",
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    // An admin's RLS scope is every session, so this is the whole platform.
    getMySessions()
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const refund = async (s: Session) => {
    if (!window.confirm(`Refund "${s.title}" (${formatInr(s.amountInr)})?\n\n${refundWarning(s)}`)) return;
    setError("");
    setBusy(s.id);
    try {
      await recordRefund(s.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record that refund");
    } finally {
      setBusy(null);
    }
  };

  const needle = query.trim().toLowerCase();
  const visible = sessions.filter((s) => {
    const byFilter =
      filter === "all" ? true : filter === "paid" ? canRefund(s) : filter === "unpaid" ? s.paymentStatus === "unpaid" : s.paymentStatus === "refunded";
    return byFilter && (!needle || `${s.title} ${s.clientName} ${s.expertName}`.toLowerCase().includes(needle));
  });

  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Sessions</h1>
        <p className="font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)] mt-2">EVERY BOOKING ON THE PLATFORM · RECORD REFUNDS</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter sessions">
          {([["all", "All"], ["paid", "Paid"], ["unpaid", "Unpaid"], ["refunded", "Refunded"]] as [Filter, string][]).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`px-4 py-2 font-mono-sos text-[10px] tracking-[0.2em] border transition-colors ${
                filter === id ? "border-[var(--color-primary)] text-[var(--text-primary)] bg-[var(--bg-surface-2)]" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 border border-[var(--border)] bg-[var(--bg-base)] px-3 h-9 w-full sm:w-[260px] focus-within:border-[var(--border-strong)]">
          <Search size={13} className="text-[var(--text-faint)] shrink-0" strokeWidth={1.75} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, client or expert"
            aria-label="Search sessions"
            className="w-full bg-transparent font-inter text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none"
          />
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-[var(--color-orange)] font-mono-sos">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">Loading sessions…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">No sessions match.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((s) => (
            <li key={s.id} className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-inter text-sm font-semibold text-[var(--text-primary)] truncate">{s.title}</p>
                <p className="font-inter text-xs text-[var(--text-muted)] mt-1 truncate">{s.clientName} with {s.expertName}</p>
                <p className="font-mono-sos text-[10px] text-[var(--text-faint)] mt-1">{s.date} • {s.time} • {s.status}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-display text-xl text-[var(--text-primary)]">{formatInr(s.amountInr)}</p>
                  <p className="font-mono-sos text-[9px] tracking-[0.15em] text-[var(--text-muted)]">{PAYMENT_LABEL[s.paymentStatus].toUpperCase()}</p>
                </div>
                {canRefund(s) && (
                  <button
                    onClick={() => refund(s)}
                    disabled={busy === s.id}
                    className="flex items-center gap-2 border border-[var(--border-strong)] px-4 py-2.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:border-[var(--color-orange)] hover:text-[var(--color-orange)] disabled:opacity-50"
                  >
                    {busy === s.id && <Loader2 size={12} className="animate-spin" />}
                    RECORD REFUND
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
