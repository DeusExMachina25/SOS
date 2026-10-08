"use client";

import { useState, useEffect } from "react";
import { Video, X, Clock, CreditCard, CalendarClock, FolderLock, MessageSquare, FileText } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  getApprovedExperts,
  getMySessions,
  bookSession,
  getOrCreateThread,
  getCurrentUserId,
  getMyPayments,
  getMyChatThreads,
  getMyVaultFiles,
  getExpertAvailabilityRules,
  getExpertBusyRanges,
} from "@/lib/data/queries";
import { generateSlotsForDate, todayDateInput } from "@/lib/data/slots";
import { formatInr, formatFileSize, formatMessageTime } from "@/lib/data/format";
import type { Session, Expert, Payment, ChatThreadSummary, VaultFile, AvailabilityRule } from "@/lib/data/types";
import PaymentModal from "@/components/dashboard/PaymentModal";
import LiquidWaveGauge from "@/components/dashboard/LiquidWaveGauge";
import StatTile from "@/components/dashboard/StatTile";
import Panel from "@/components/dashboard/Panel";
import MonthlyBarChart from "@/components/dashboard/MonthlyBarChart";
import { monthDelta, lastMonths } from "@/components/dashboard/metrics";

export default function ClientDashboard() {
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [rulesByExpert, setRulesByExpert] = useState<Record<string, AvailabilityRule[]>>({});

  const [sessionType, setSessionType] = useState("Architecture Review");
  const [sessionDate, setSessionDate] = useState(todayDateInput());
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [dbExperts, setDbExperts] = useState<Expert[]>([]);
  const [currentExpert, setCurrentExpert] = useState<Expert | null>(null);
  const [loadError, setLoadError] = useState("");

  // Payment step, shown after a successful booking.
  const [paymentSession, setPaymentSession] = useState<Session | null>(null);

  // Real data for the overview panels
  const [payments, setPayments] = useState<Payment[]>([]);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);

  // Time of Day and Timezone Offsets
  const [greeting, setGreeting] = useState("Hello");
  const [localTimeStr, setLocalTimeStr] = useState("");

  const nextSession = sessions.filter(s => s.status === "scheduled")[0];
  const paidTotal = payments.filter(p => p.status === "paid").reduce((n, p) => n + p.amountInr, 0);
  const unpaidSessions = sessions.filter(
    s => s.status !== "cancelled" && s.paymentStatus === "unpaid" && (s.amountInr ?? 0) > 0
  );
  const dueTotal = unpaidSessions.reduce((n, s) => n + (s.amountInr ?? 0), 0);
  const settledPct = paidTotal + dueTotal > 0 ? (paidTotal / (paidTotal + dueTotal)) * 100 : 0;
  const recentThreads = threads.filter(t => t.lastMessage).slice(0, 3);
  const recentFiles = files.slice(0, 4);

  useEffect(() => {
    // Dynamic Greeting & Time Clock
    const updateTimeContext = () => {
      const now = new Date();
      const hrs = now.getHours();
      if (hrs < 12) setGreeting("Good morning");
      else if (hrs < 17) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      setLocalTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }));
    };

    updateTimeContext();
    const interval = setInterval(updateTimeContext, 30000);

    async function loadDashboardData() {
      try {
        const [experts, mySessions, myPayments, myThreads, myFiles] = await Promise.all([
          getApprovedExperts(),
          getMySessions(),
          getMyPayments(),
          getMyChatThreads(),
          getMyVaultFiles(),
        ]);
        setDbExperts(experts);
        setSessions(mySessions);
        setPayments(myPayments);
        setThreads(myThreads);
        setFiles(myFiles);

        const platterSelected = localStorage.getItem("platter_selected_expert");
        let targetExpert = experts[0] ?? null;

        if (platterSelected) {
          const match = experts.find(e => e.id === platterSelected);
          if (match) targetExpert = match;
          localStorage.removeItem("platter_selected_expert");
        } else if (mySessions.length > 0) {
          const match = experts.find(e => e.id === mySessions[0].expertId);
          if (match) targetExpert = match;
        }

        if (targetExpert) {
          setCurrentExpert(targetExpert);
          setSelectedExpertId(targetExpert.id);
        }
      } catch (err) {
        console.error("Error loading client dashboard data", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    }

    loadDashboardData();
    return () => clearInterval(interval);
  }, []);

  // Real bookable times: the expert's weekly availability minus what is already booked.
  useEffect(() => {
    if (!isBooking || !selectedExpertId || !sessionDate) return;
    let cancelled = false;
    (async () => {
      setSlotsState("loading");
      setSelectedSlot("");
      try {
        let rules = rulesByExpert[selectedExpertId];
        if (!rules) {
          rules = await getExpertAvailabilityRules(selectedExpertId);
          if (cancelled) return;
          setRulesByExpert((prev) => ({ ...prev, [selectedExpertId]: rules! }));
        }
        const [y, m, d] = sessionDate.split("-").map(Number);
        const dayStart = new Date(y, m - 1, d);
        const dayEnd = new Date(y, m - 1, d + 1);
        const busy = await getExpertBusyRanges(selectedExpertId, dayStart.toISOString(), dayEnd.toISOString());
        if (cancelled) return;
        setSlots(generateSlotsForDate(sessionDate, rules, busy, 60));
        setSlotsState("ready");
      } catch (err) {
        console.error("Failed to load availability", err);
        if (!cancelled) setSlotsState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // rulesByExpert is a cache; re-running when it fills would refetch busy ranges needlessly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBooking, selectedExpertId, sessionDate]);

  const handleConfirmBooking = async () => {
    const targetExpert = dbExperts.find(e => e.id === selectedExpertId) ?? currentExpert;
    if (!targetExpert) {
      setBookingError("Choose an expert before booking.");
      return;
    }

    if (!selectedSlot) {
      setBookingError("Choose one of the available times.");
      return;
    }
    const timeMatch = selectedSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) {
      setBookingError("Choose one of the available times.");
      return;
    }
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const [yy, mm, dd] = sessionDate.split("-").map(Number);
    const scheduledDate = new Date(yy, mm - 1, dd, hours, minutes, 0, 0);

    setBookingError("");
    setBookingSubmitting(true);
    try {
      const created = await bookSession({
        expertId: targetExpert.id,
        title: sessionType,
        startsAt: scheduledDate.toISOString(),
        durationMinutes: 60,
      });

      setSessions(prev => [created, ...prev]);

      // Best-effort: open a chat thread with the expert so Messages isn't
      // empty right after booking. Never block the booking on this.
      getCurrentUserId()
        .then((uid) => (uid ? getOrCreateThread(uid, targetExpert.id) : null))
        .catch((err) => console.error("Failed to open chat thread", err));

      setIsBooking(false);
      setPaymentSession(created);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book session");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const upcoming = sessions.filter(s => s.status === "scheduled");
  const sessionSeries = sessions
    .filter(s => s.status !== "cancelled")
    .map(s => ({ at: s.startsAt, value: 1 }));
  const sessionsDelta = monthDelta(sessionSeries);

  // One chronological feed from chat and vault, newest first.
  const activity = [
    ...recentThreads.map(t => ({
      id: `m-${t.id}`,
      at: t.lastMessageAt ?? "",
      kind: "message" as const,
      title: t.counterpartName,
      detail: t.lastMessage ?? "",
      href: "/dashboard/client/chat",
    })),
    ...recentFiles.map(f => ({
      id: `f-${f.id}`,
      at: f.createdAt,
      kind: "file" as const,
      title: `${f.uploaderName} added ${f.name}`,
      detail: formatFileSize(f.sizeBytes),
      href: "/dashboard/client/vault",
    })),
  ].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 6);

  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)]">
          {greeting}{localTimeStr ? ` • ${localTimeStr}` : ""}
        </p>
        {loadError && <p className="font-mono-sos text-xs text-[var(--color-orange)] mt-2">{loadError}</p>}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="SESSIONS" value={String(sessionSeries.length)} icon={Video} delta={sessionsDelta} note="Booked to date" />
        <StatTile label="UPCOMING" value={String(upcoming.length)} icon={CalendarClock} note={nextSession ? `Next: ${nextSession.date}` : "Nothing scheduled"} />
        <StatTile label="VAULT FILES" value={String(files.length)} icon={FolderLock} note="Shared with your experts" />
        <StatTile label="DUE NOW" value={formatInr(dueTotal)} icon={CreditCard} note={unpaidSessions.length ? `${unpaidSessions.length} awaiting payment` : "Nothing due"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Sessions over time" subtitle="LAST 6 MONTHS" className="xl:col-span-2">
          <MonthlyBarChart data={lastMonths(sessionSeries, 6)} caption="Sessions booked per month over the last six months" />
        </Panel>

        <Panel
          title="Next session"
          subtitle="UP NEXT"
          href="/dashboard/client/sessions"
          action={
            <button
              onClick={() => setIsBooking(true)}
              className="border border-[var(--border-strong)] px-3 py-1.5 font-mono-sos text-[9px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:border-[var(--color-primary)]"
            >
              BOOK
            </button>
          }
        >
          {nextSession ? (
            <div className="flex flex-col h-full gap-4">
              <div>
                <p className="font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)] truncate">
                  {currentExpert?.fullName ?? nextSession.expertName}
                </p>
                <h3 className="font-editorial text-2xl text-[var(--text-primary)] leading-tight mt-2">{nextSession.title}</h3>
                <p className="font-mono-sos text-[11px] text-[var(--color-primary)] flex items-center gap-2 mt-3">
                  <Clock size={13} className="shrink-0" /> {nextSession.date} • {nextSession.time}
                </p>
              </div>
              <div className="mt-auto">
                {nextSession.paymentStatus === "unpaid" ? (
                  <button
                    onClick={() => setPaymentSession(nextSession)}
                    className="flex w-full items-center justify-center gap-2 border border-[var(--color-primary)] bg-[var(--bg-surface-2)] py-3.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-base)]"
                  >
                    <CreditCard size={14} /> PAY {formatInr(nextSession.amountInr)} TO UNLOCK THE CALL
                  </button>
                ) : (
                  <Link
                    href={`/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.title)}`}
                    className="group/join flex w-full items-center justify-center gap-2 border border-[var(--border-strong)] bg-[var(--bg-surface-2)] py-3.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:border-[var(--color-primary)]"
                  >
                    <Video size={14} className="text-[var(--text-muted)] group-hover/join:text-[var(--color-primary)] transition-colors" /> JOIN VIDEO CALL
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-4">
              <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">NO SCHEDULED MEETINGS</p>
              <button
                onClick={() => setIsBooking(true)}
                className="border border-[var(--border-strong)] bg-[var(--bg-surface-2)] px-4 py-2.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:border-[var(--color-primary)]"
              >
                SCHEDULE SESSION
              </button>
            </div>
          )}
        </Panel>

        <Panel title="Payments" subtitle="HELD UNTIL DELIVERED" href="/dashboard/client/sessions">
          <LiquidWaveGauge percentage={settledPct} balance={paidTotal} />
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <div className="font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)] mb-3">AWAITING PAYMENT</div>
            <div className="max-h-[160px] overflow-y-auto scrollbar-thin space-y-2">
              {unpaidSessions.length === 0 && (
                <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)] py-2">NOTHING DUE</p>
              )}
              {unpaidSessions.map((sess) => (
                <div key={sess.id} className="flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--bg-surface-2)] p-3">
                  <div className="min-w-0">
                    <p className="font-inter text-[11px] font-semibold text-[var(--text-primary)] truncate">{sess.title}</p>
                    <p className="font-mono-sos text-[9px] tracking-wider text-[var(--text-faint)] mt-0.5 truncate">{sess.expertName} • {sess.date}</p>
                  </div>
                  <button
                    onClick={() => setPaymentSession(sess)}
                    className="shrink-0 border border-[var(--color-primary)] px-3 py-1.5 font-mono-sos text-[10px] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-base)]"
                  >
                    Pay {formatInr(sess.amountInr)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Recent activity" subtitle="MESSAGES AND VAULT" className="xl:col-span-2" flush>
          {activity.length === 0 ? (
            <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)] p-5">NOTHING YET — MESSAGES AND SHARED FILES APPEAR HERE</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {activity.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--bg-surface-2)]">
                    <span className="mt-0.5 shrink-0 text-[var(--text-faint)]">
                      {a.kind === "message" ? <MessageSquare size={14} strokeWidth={1.75} /> : <FileText size={14} strokeWidth={1.75} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-inter text-xs font-semibold text-[var(--text-primary)] truncate">{a.title}</span>
                      <span className="block font-inter text-[12px] font-light text-[var(--text-muted)] line-clamp-1 mt-0.5">{a.detail}</span>
                    </span>
                    <span className="shrink-0 font-mono-sos text-[9px] tracking-wider text-[var(--text-faint)]">{formatMessageTime(a.at || null)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Book New Modal Overlay */}
      <AnimatePresence>
        {isBooking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[var(--bg-overlay)] backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="glass-panel p-10 max-w-lg w-full relative border-organic shadow-[0_40px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
            >
              <button 
                onClick={() => setIsBooking(false)}
                className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-inter text-3xl font-light tracking-[0.10em] uppercase mb-4 text-embossed">Book a Session</h2>
              <p className="text-xs text-[var(--text-muted)] mb-10 uppercase font-mono-sos tracking-widest">
                {(() => {
                  const ex = dbExperts.find((e) => e.id === selectedExpertId);
                  return ex ? `${formatInr(ex.sessionRateInr)} per 60-minute session · paid after you book` : "Choose an expert to see the session fee";
                })()}
              </p>
              
              <div className="space-y-6 mb-10">
                <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">SESSION TYPE</label>
                  <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer">
                    <option>Architecture Review</option>
                    <option>Design Consultation</option>
                    <option>Follow-up</option>
                  </select>
                </div>
                 <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">ASSIGNED EXPERT</label>
                  <select value={selectedExpertId} onChange={(e) => setSelectedExpertId(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer">
                    {dbExperts.map(exp => (
                      <option key={exp.id} value={exp.id}>{exp.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="booking-date" className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">DATE</label>
                  <input
                    id="booking-date"
                    type="date"
                    min={todayDateInput()}
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] [color-scheme:dark] transition-colors shadow-inner font-bold"
                  />

                  <div className="mt-6" aria-live="polite">
                    <span className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">AVAILABLE TIMES</span>
                    {slotsState === "loading" && (
                      <p className="text-sm text-[var(--text-muted)]">Checking availability…</p>
                    )}
                    {slotsState === "error" && (
                      <p className="text-sm text-[var(--color-orange)]">We couldn&apos;t load this expert&apos;s times. Please try again.</p>
                    )}
                    {slotsState === "ready" && slots.length === 0 && (
                      <p className="text-sm text-[var(--text-muted)]">
                        {rulesByExpert[selectedExpertId]?.length
                          ? "No free times on this date. Try another day."
                          : "This expert hasn't published availability yet. Try another expert, or check back soon."}
                      </p>
                    )}
                    {slotsState === "ready" && slots.length > 0 && (
                      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Available times">
                        {slots.map((t) => (
                          <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={selectedSlot === t}
                            onClick={() => setSelectedSlot(t)}
                            className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                              selectedSlot === t
                                ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)]"
                                : "bg-[var(--bg-base)] text-[var(--text-primary)] border-[var(--border-strong)] hover:border-[var(--color-primary)]"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {bookingError && (
                <p className="text-sm text-[var(--color-orange)] font-mono-sos mb-4 text-center">{bookingError}</p>
              )}

              <button
                onClick={handleConfirmBooking}
                disabled={bookingSubmitting}
                className="btn-sos-filled w-full py-5 text-lg text-center justify-center rounded-2xl tracking-widest mt-8 shadow-lg disabled:opacity-50"
              >
                {bookingSubmitting ? "Booking…" : "Confirm Booking"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment step, shown right after a successful booking */}
      {paymentSession && (
        <PaymentModal
          sessionId={paymentSession.id}
          amountInr={paymentSession.amountInr}
          expertName={paymentSession.expertName}
          expertUpiId={dbExperts.find(e => e.id === paymentSession.expertId)?.upiId ?? null}
          onClose={() => setPaymentSession(null)}
          onPaid={() => {
            Promise.all([getMySessions(), getMyPayments()])
              .then(([ss, ps]) => { setSessions(ss); setPayments(ps); })
              .catch((err) => console.error("Refresh after payment failed", err));
          }}
        />
      )}
    </div>
  );
}
