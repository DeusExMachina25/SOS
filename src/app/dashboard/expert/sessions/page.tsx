"use client";

import { Calendar as CalIcon, Video, Search, CalendarDays, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getMySessions, getMyPayments, confirmUpiPaymentReceived } from "@/lib/data/queries";
import type { Session, Payment } from "@/lib/data/types";

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-strong)]" },
  processing: { label: "Awaiting Confirmation", className: "bg-[var(--color-orange)]/10 text-[var(--color-orange)] border-[var(--color-orange)]/20" },
  escrow_held: { label: "Escrow Held", className: "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20" },
  released: { label: "Paid", className: "bg-[var(--color-green)]/10 text-[var(--color-green)] border-[var(--color-green)]/20" },
  refunded: { label: "Refunded", className: "bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-strong)]" },
};

export default function ExpertSessionsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [paymentsBySession, setPaymentsBySession] = useState<Map<string, Payment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMySessions(), getMyPayments()])
      .then(([sess, payments]) => {
        setSessions(sess);
        setPaymentsBySession(new Map(payments.map((p) => [p.sessionId, p])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load consultations"))
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = sessions.filter(s => activeFilter === "all" || s.status === activeFilter);

  const badgeFor = (session: Session) => {
    const payment = paymentsBySession.get(session.id);
    if (payment?.status === "processing") return PAYMENT_BADGE.processing;
    return PAYMENT_BADGE[session.paymentStatus] ?? PAYMENT_BADGE.unpaid;
  };

  const handleConfirmPayment = async (sessionId: string) => {
    setConfirming(sessionId);
    try {
      await confirmUpiPaymentReceived(sessionId);
      setPaymentsBySession((prev) => {
        const next = new Map(prev);
        const existing = next.get(sessionId);
        if (existing) next.set(sessionId, { ...existing, status: "paid" });
        return next;
      });
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, paymentStatus: "released" } : s)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm payment");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="w-full relative min-h-screen flex flex-col pt-6 pb-24">
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)] flex items-center gap-4">
            <CalendarDays size={32} className="text-[var(--color-orange)]" /> Consultations Tracker
          </h1>
          <p className="font-mono-sos text-sm text-[var(--text-muted)] mt-3 tracking-widest uppercase">Manage your scheduled client consultations</p>
        </div>
        <div className="flex gap-4 items-start w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search consultations..."
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--color-orange)] text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
        </div>
      </header>

      {/* FILTERS */}
      <div className="flex gap-4 mb-8">
        {["all", "scheduled", "completed", "cancelled"].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === filter
                ? "bg-[var(--bg-surface-2)] text-[var(--color-orange)] border border-[var(--color-orange)]/50 shadow-sm"
                : "bg-transparent text-[var(--text-muted)] border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-orange)] font-mono-sos mb-8">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">Loading consultations…</p>
      ) : filteredSessions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">No consultations yet.</p>
      ) : (
        /* SESSIONS LIST */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSessions.map((session) => {
            const badge = badgeFor(session);
            const payment = paymentsBySession.get(session.id);
            const awaitingConfirmation = payment?.method === "upi_direct" && payment?.status === "processing";

            return (
              <div key={session.id} className={`glass-panel p-6 rounded-[32px] border transition-all hover:border-[var(--border-strong)] ${session.status !== 'scheduled' ? 'border-[var(--border)] bg-[var(--bg-surface-2)]/30 opacity-70' : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">{session.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] font-inter">Client: {session.clientName}</p>
                  </div>
                  {session.status === 'scheduled' ? (
                    <div className="px-3 py-1 bg-[var(--color-orange)]/10 text-[var(--color-orange)] text-[10px] font-bold rounded-full uppercase tracking-widest border border-[var(--color-orange)]/20">
                      Upcoming
                    </div>
                  ) : session.status === 'cancelled' ? (
                    <div className="px-3 py-1 bg-[var(--bg-surface-2)] text-[var(--text-muted)] text-[10px] font-bold rounded-full uppercase tracking-widest border border-[var(--border-strong)]">
                      Cancelled
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-[var(--bg-surface-2)] text-[var(--text-muted)] text-[10px] font-bold rounded-full uppercase tracking-widest border border-[var(--border-strong)]">
                      Completed
                    </div>
                  )}
                </div>

                <div className={`inline-block px-3 py-1 mb-6 text-[10px] font-bold rounded-full uppercase tracking-widest border ${badge.className}`}>
                  {badge.label}
                </div>

                <div className="flex items-center gap-6 text-sm font-mono-sos text-[var(--text-faint)] mb-8">
                  <div className="flex items-center gap-2"><CalIcon size={14} className={session.status === 'scheduled' ? "text-[var(--color-orange)]" : ""} /> {session.date}</div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">• {session.time}</div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">• {session.duration}</div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-[var(--border)]">
                  {awaitingConfirmation && (
                    <button
                      onClick={() => handleConfirmPayment(session.id)}
                      disabled={confirming === session.id}
                      className="px-6 py-3 text-xs w-full sm:w-auto text-center justify-center font-bold text-[var(--color-green)] hover:text-[var(--bg-base)] hover:bg-[var(--color-green)] transition-colors rounded-2xl bg-[var(--color-green)]/10 border border-[var(--color-green)]/30 flex items-center gap-2 justify-center disabled:opacity-50"
                    >
                      {confirming === session.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Confirm Payment Received
                    </button>
                  )}
                  {session.status === 'scheduled' ? (
                    <Link
                      href={`/dashboard/video-call?sessionId=${session.id}&sessionName=${encodeURIComponent(session.title)}&displayName=${encodeURIComponent(session.expertName)}`}
                      className="btn-sos-filled px-6 py-3 text-xs w-full sm:w-auto text-center justify-center bg-[var(--color-orange)] hover:bg-[var(--color-orange)]/90 text-[var(--bg-base)] border-transparent shadow-md transition-colors rounded-2xl"
                    >
                      <Video size={16} className="mr-2 inline" /> Join Video Call
                    </Link>
                  ) : (
                    <button className="px-6 py-3 text-xs w-full sm:w-auto text-center justify-center font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)]">
                      View Notes
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
