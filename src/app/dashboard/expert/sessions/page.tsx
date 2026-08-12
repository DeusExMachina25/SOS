"use client";

import { Calendar as CalIcon, Video, Search, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getMySessions, getMyPayments, confirmUpiPaymentReceived } from "@/lib/data/queries";
import type { Session, Payment } from "@/lib/data/types";

export default function ExpertSessionsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMySessions(), getMyPayments()])
      .then(([mySessions, myPayments]) => {
        setSessions(mySessions);
        setPayments(myPayments);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleConfirmReceived = async (sessionId: string) => {
    setConfirmingId(sessionId);
    try {
      await confirmUpiPaymentReceived(sessionId);
      setPayments((prev) =>
        prev.map((p) => (p.sessionId === sessionId ? { ...p, status: "paid" } : p))
      );
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, paymentStatus: "released" } : s))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm payment");
    } finally {
      setConfirmingId(null);
    }
  };

  // RLS already scopes `sessions` to this expert; only the status filter applies here.
  const filteredSessions = sessions.filter(s => activeFilter === "all" || s.status === activeFilter);

  return (
    <div className="w-full relative min-h-screen flex flex-col pt-6 pb-24">
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)] flex items-center gap-4">
            <CalendarDays size={32} className="text-orange-400" /> Consultations Tracker
          </h1>
          <p className="font-mono-sos text-sm text-[var(--text-muted)] mt-3 tracking-widest uppercase">Manage your scheduled client consultations</p>
        </div>
        <div className="flex gap-4 items-start w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search consultations..." 
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
        </div>
      </header>

      {/* FILTERS */}
      <div className="flex gap-4 mb-8">
        {["all", "scheduled", "completed"].map(filter => (
          <button 
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === filter 
                ? "bg-[var(--bg-surface-2)] text-orange-400 border border-orange-400/50 shadow-sm" 
                : "bg-transparent text-[var(--text-muted)] border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* SESSIONS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSessions.map((session) => (
          <div key={session.id} className={`glass-panel p-6 rounded-[32px] border transition-all hover:border-[var(--border-strong)] ${session.status === 'completed' ? 'border-[var(--border)] bg-[var(--bg-surface-2)]/30 opacity-70' : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">{session.title}</h3>
                <p className="text-sm text-[var(--text-muted)] font-inter">Client: {session.clientName}</p>
              </div>
              {session.status === 'scheduled' ? (
                <div className="px-3 py-1 bg-orange-400/10 text-orange-400 text-[10px] font-bold rounded-full uppercase tracking-widest border border-orange-400/20">
                  Upcoming
                </div>
              ) : (
                <div className="px-3 py-1 bg-[var(--bg-surface-2)] text-[var(--text-muted)] text-[10px] font-bold rounded-full uppercase tracking-widest border border-[var(--border-strong)]">
                  Completed
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 text-sm font-mono-sos text-[var(--text-faint)] mb-8">
              <div className="flex items-center gap-2"><CalIcon size={14} className={session.status === 'scheduled' ? "text-orange-400" : ""} /> {session.date}</div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">• {session.time}</div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">• {session.duration}</div>
            </div>

            {(() => {
              const payment = payments.find((p) => p.sessionId === session.id);
              const awaitingConfirmation = payment?.method === "upi_direct" && payment.status === "processing";
              return (
                <div className="flex justify-between items-center gap-3 pt-6 border-t border-[var(--border)] flex-wrap">
                  {awaitingConfirmation ? (
                    <button
                      onClick={() => handleConfirmReceived(session.id)}
                      disabled={confirmingId === session.id}
                      className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {confirmingId === session.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Confirm Payment Received
                    </button>
                  ) : session.paymentStatus === "unpaid" ? (
                    <span className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border-strong)]">
                      Awaiting Client Payment
                    </span>
                  ) : (
                    <span className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      {session.paymentStatus === "escrow_held" ? "Escrow (Demo)" : session.paymentStatus === "released" ? "Paid" : "Refunded"}
                    </span>
                  )}

                  {session.status === 'scheduled' ? (
                    <Link
                      href={`/dashboard/video-call?sessionId=${session.id}&sessionName=${encodeURIComponent(session.title)}`}
                      className="btn-sos-filled px-6 py-3 text-xs text-center justify-center bg-orange-400 hover:bg-orange-500 text-white border-transparent shadow-md transition-colors rounded-2xl"
                    >
                      <Video size={16} className="mr-2 inline" /> Join Video Call
                    </Link>
                  ) : (
                    <button className="px-6 py-3 text-xs text-center justify-center font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)]">
                      View Notes
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
