"use client";

import { useState, useEffect } from "react";
import { Video, X, Star, MapPin, Clock, Bell, CreditCard, ArrowRight, MoreHorizontal } from "lucide-react";
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

function LiquidWaveGauge({ percentage, balance }: { percentage: number, balance: number }) {
  const pct = Math.max(0, Math.min(100, percentage));
  const yLevel = 100 - pct;

  let color = "var(--color-green)";
  if (pct < 30) {
    color = "var(--color-orange)";
  } else if (pct < 60) {
    color = "var(--color-primary)";
  }

  return (
    <div className="relative w-44 h-44 flex items-center justify-center select-none mx-auto">
      {/* Outer Glow Ring */}
      <div 
        className="absolute inset-0 rounded-full border flex items-center justify-center p-2 shadow-2xl transition-all duration-500"
        style={{ borderColor: color, boxShadow: `0 0 20px ${color}1A` }}
      >
        {/* Inner Circle Frame */}
        <div className="w-full h-full rounded-full bg-[var(--bg-base)] border border-[var(--border)] overflow-hidden relative">
          
          {/* Animated SVG Wave */}
          <svg 
            viewBox="0 0 100 100" 
            className="absolute inset-0 w-full h-full transition-all duration-700 ease-out"
            style={{ transform: `translateY(${yLevel}%)` }}
          >
            {/* Background Wave */}
            <path 
              d="M0 20 C 30 15, 70 25, 100 20 L 100 100 L 0 100 Z" 
              fill={color} 
              opacity="0.15"
              className="animate-wave-slow"
              style={{ transformOrigin: "50% 50%" }}
            />
            {/* Foreground Wave */}
            <path 
              d="M0 20 C 30 25, 70 15, 100 20 L 100 100 L 0 100 Z" 
              fill={color} 
              opacity="0.4"
              className="animate-wave-fast"
              style={{ transformOrigin: "50% 50%" }}
            />
          </svg>

          {/* Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 font-inter">
            <span className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Paid</span>
            <span className="text-2xl font-bold text-[var(--text-primary)]">{formatInr(balance)}</span>
            <span className="text-[9px] font-mono-sos text-[var(--text-muted)] tracking-wider mt-1">{pct.toFixed(0)}% Settled</span>
          </div>

        </div>
      </div>
      
      <style jsx global>{`
        @keyframes wave-shift-slow {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-25%) scaleY(1.05); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes wave-shift-fast {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(25%) scaleY(0.95); }
          100% { transform: translateX(0) scaleY(1); }
        }
        .animate-wave-slow {
          animation: wave-shift-slow 6s ease-in-out infinite;
        }
        .animate-wave-fast {
          animation: wave-shift-fast 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

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

  return (
    <div className="w-full h-full relative flex flex-col pb-12 xl:pb-0 min-h-0">
      {/* 1. HEADER SECTION & NOTIFICATIONS */}
      <header className="mb-6 xl:mb-8 mt-2 flex flex-row justify-between items-end gap-6 shrink-0">
        <div>
          <h1 className="font-inter text-3xl md:text-4xl font-light tracking-[0.18em] text-[var(--text-primary)] uppercase">Overview</h1>
          <p className="font-mono-sos text-xs text-[var(--text-faint)] mt-2 tracking-widest uppercase">{greeting}, Client • {localTimeStr}</p>
          {loadError && <p className="font-mono-sos text-xs text-[var(--color-orange)] mt-2">{loadError}</p>}
        </div>
        <div className="flex gap-4 items-center">
          {/* Notification Bell */}
          <Link href="/dashboard/client/chat" title="Messages" className="relative p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--color-primary)] transition-colors group shadow-lg">
            <Bell size={24} className="text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
            {unpaidSessions.length > 0 && (
              <span className="absolute top-3 right-3 w-3 h-3 bg-[var(--color-orange)] rounded-full border-2 border-[var(--bg-surface)]"></span>
            )}
          </Link>
        </div>
      </header>

      {/* 2. THREE COLUMN LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 w-full min-h-0 pb-12 xl:pb-0">
        
        {/* COLUMN 1: FINANCIALS & OPERATIONS */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          
          {/* FINANCIAL STATUS WIDGET */}
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex flex-col flex-1 xl:h-full xl:min-h-0">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-green)] to-[var(--color-green)]/70"></div>
            <div className="flex justify-between items-start mb-6 px-4">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Payments</h3>
              <Link
                href="/dashboard/client/sessions"
                className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--color-green)] transition-colors uppercase tracking-widest flex items-center gap-1 font-mono-sos"
              >
                All Sessions <ArrowRight size={12} />
              </Link>
            </div>

            <div className="flex flex-col gap-6 flex-1 justify-between min-h-0 px-4">
              <div className="w-full">
                <LiquidWaveGauge percentage={settledPct} balance={paidTotal} />
                <div className="flex justify-between text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mt-5">
                  <span>Due now</span>
                  <span className="text-[var(--text-primary)]">{formatInr(dueTotal)}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--border)] pt-4 w-full">
                <div className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mb-3">Awaiting Payment</div>
                <div className="max-h-[160px] overflow-y-auto space-y-2 scrollbar-thin pr-1">
                  {unpaidSessions.length === 0 && (
                    <p className="text-[11px] text-[var(--text-faint)] font-mono-sos uppercase tracking-wider py-3">Nothing due</p>
                  )}
                  {unpaidSessions.map((sess) => (
                    <div key={sess.id} className="p-3 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{sess.title}</p>
                        <p className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-wider mt-0.5">{sess.expertName} • {sess.date}</p>
                      </div>
                      <button
                        onClick={() => setPaymentSession(sess)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40 text-[10px] font-bold text-[var(--text-primary)] hover:bg-[var(--color-primary)]/20 transition-all"
                      >
                        Pay {formatInr(sess.amountInr)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full flex items-center gap-2 text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mt-auto">
                <CreditCard size={12} /> Payments are held until your session is delivered
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: VAULT LOGS & MESSAGES HUB */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col flex-1 shadow-lg relative overflow-hidden min-h-[400px] xl:min-h-0 xl:h-full">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-orange)]"></div>
            
            {/* Upper Pane: Recent Messages */}
            <div className="xl:flex-[6] flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-3 px-4">
                <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Recent Messages</h3>
                <Link 
                  href="/dashboard/client/chat" 
                  className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest flex items-center gap-1 font-mono-sos"
                >
                  Open Chat <ArrowRight size={10}/>
                </Link>
              </div>

              {/* Recent conversations */}
              <div className="flex-1 overflow-y-auto px-4 space-y-4 min-h-[100px] xl:min-h-0 scrollbar-thin">
                {recentThreads.length === 0 && (
                  <p className="text-[11px] text-[var(--text-faint)] font-mono-sos uppercase tracking-wider py-3">No messages yet</p>
                )}
                {recentThreads.map((t) => (
                  <Link key={t.id} href="/dashboard/client/chat" className="flex flex-col items-start gap-1">
                    <div className="bg-[var(--bg-surface-2)] border border-[var(--border-strong)] p-4 rounded-2xl rounded-tl-sm leading-relaxed max-w-[90%] shadow-inner">
                      <p className="font-inter font-light text-[13px] text-[var(--text-muted)] line-clamp-2">{t.lastMessage}</p>
                    </div>
                    <span className="text-[8px] font-mono-sos text-[var(--text-faint)] tracking-widest pl-2 uppercase">{t.counterpartName} • {formatMessageTime(t.lastMessageAt)}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 my-5 border-t border-[var(--border-strong)] opacity-50 relative shrink-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-[var(--bg-surface-2)] text-[8px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase rounded-full border border-[var(--border)] py-0.5">Secure Collaboration</div>
            </div>

            {/* Lower Pane: Safe Activity Logs (Friendly Language) */}
            <div className="xl:flex-[4] shrink-0 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-3 px-4 shrink-0">
                <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Safe Activity Logs</h3>
                <Link 
                  href="/dashboard/client/vault" 
                  className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--color-orange)] transition-colors uppercase tracking-widest flex items-center gap-1 font-mono-sos"
                >
                  Open Vault <ArrowRight size={10}/>
                </Link>
              </div>

              {/* Recent vault files */}
              <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-[100px] xl:min-h-0 scrollbar-thin">
                {recentFiles.length === 0 && (
                  <p className="text-[11px] text-[var(--text-faint)] font-mono-sos uppercase tracking-wider py-3">No files shared yet</p>
                )}
                {recentFiles.map((f) => (
                  <div key={f.id} className="flex gap-2.5 items-start text-[11px] font-inter leading-relaxed text-[var(--text-muted)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0"></div>
                    <p>{f.uploaderName} added <span className="text-[var(--text-primary)] font-semibold">{f.name}</span> ({formatFileSize(f.sizeBytes)}).</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: UNIFIED EXPERT HUB */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          
          {/* EXPERT COMMAND CENTER CARD */}
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col relative overflow-hidden shadow-lg flex-1 min-h-[350px] xl:min-h-0 xl:h-full">
            <h3 className="text-xs font-mono-sos mb-6 px-4 text-[var(--text-faint)] tracking-widest uppercase w-full text-left">Your Expert Hub</h3>
            
            {/* Profile Info */}
            <div className="flex items-center gap-5 mb-6 px-4 shrink-0">
              <div className="w-16 h-16 rounded-full p-0.5 border border-[var(--border-strong)] relative shrink-0">
                <div className="w-full h-full rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center overflow-hidden">
                  <Star size={20} className="text-[var(--color-primary)] opacity-50" />
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--color-green)] border-[2.5px] border-[var(--bg-base)] rounded-full"></div>
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-inter text-xl font-bold text-[var(--text-primary)] mb-0.5 truncate">{currentExpert?.fullName ?? "No expert selected"}</h2>
                <p className="text-xs font-inter text-[var(--color-primary)] font-semibold mb-1 truncate">{currentExpert?.professionalTitle ?? " "}</p>
                <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-mono-sos">
                  <MapPin size={9} className="text-[var(--text-faint)] shrink-0" /> <span className="truncate">{currentExpert?.location ?? "India"}</span>
                </div>
              </div>
            </div>

            {/* Next Session Section */}
            {nextSession ? (
              <div className="mx-4 mb-6 p-5 rounded-2xl border border-[var(--border-strong)] bg-white/[0.02] relative group/sess-card min-h-0 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-20 h-6 rounded-tr-2xl rounded-bl-2xl bg-[var(--color-primary)]/10 flex items-center justify-center border-l border-b border-[var(--border-strong)] text-[8px] font-mono-sos text-[var(--color-primary)] uppercase tracking-wider">Scheduled</div>
                <div>
                  <p className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mb-1">Upcoming Session</p>
                  <h4 className="font-inter text-base font-bold text-[var(--text-primary)] mb-1 truncate">{nextSession.title}</h4>
                  <p className="text-xs text-[var(--color-primary)] font-mono-sos flex items-center gap-1.5 mb-4">
                    <Clock size={12} className="shrink-0" /> {nextSession.date} • {nextSession.time}
                  </p>
                </div>

                {nextSession.paymentStatus === "unpaid" ? (
                  <button
                    onClick={() => setPaymentSession(nextSession)}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40 text-[var(--text-primary)] py-3.5 rounded-xl text-xs font-bold transition-all hover:bg-[var(--color-primary)]/20"
                  >
                    <CreditCard size={14} /> Pay {formatInr(nextSession.amountInr)} to unlock the call
                  </button>
                ) : (
                <Link
                  href={`/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.title)}`}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] py-3.5 rounded-xl text-xs font-bold transition-all hover:border-[var(--color-primary)] group/join"
                >
                  <Video size={14} className="text-[var(--text-muted)] group-hover/join:text-[var(--color-primary)] transition-colors" /> Join Video Call
                </Link>
                )}
              </div>
            ) : (
              <div className="mx-4 mb-6 p-5 rounded-2xl border border-dashed border-[var(--border)] text-center flex flex-col items-center justify-center bg-white/[0.01] flex-1">
                <p className="text-[10px] text-[var(--text-faint)] font-mono-sos uppercase tracking-wider mb-3">No Scheduled Meetings</p>
                <button 
                  onClick={() => setIsBooking(true)} 
                  className="px-4 py-2.5 border border-[var(--border-strong)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold tracking-widest text-[9px] rounded-xl transition-all hover:border-[var(--color-primary)] uppercase"
                >
                  Schedule Session
                </button>
              </div>
            )}

            {/* General Actions */}
            {nextSession && (
              <div className="px-4 w-full shrink-0">
                <button 
                  onClick={() => setIsBooking(true)} 
                  className="w-full border border-[var(--border-strong)] hover:border-[var(--color-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] py-3 rounded-xl text-xs font-bold transition-all mb-4 uppercase tracking-wider font-mono-sos text-[10px]"
                >
                  Schedule Another Session
                </button>
              </div>
            )}
            
            {/* Upcoming bookings */}
            <div className="mt-auto px-4 shrink-0">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-mono-sos text-[var(--text-faint)] uppercase tracking-widest">Upcoming</span>
                <span className="text-[var(--text-muted)] flex items-center gap-1"><MoreHorizontal size={12}/> {sessions.filter(s => s.status === "scheduled").length}</span>
              </div>
              {sessions.filter(s => s.status === "scheduled").slice(0, 2).map((s) => (
                <div key={s.id} className="bg-[var(--bg-surface-2)] rounded-2xl p-4 border border-[var(--border)] flex items-center justify-between shadow-inner mb-2">
                  <span className="font-inter text-xs text-[var(--text-muted)] font-semibold truncate pr-3">{s.title}</span>
                  <span className={`text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border font-mono-sos shrink-0 ${s.paymentStatus === "unpaid" ? "text-[var(--color-orange)] bg-[var(--color-orange)]/10 border-[var(--color-orange)]/20" : "text-[var(--color-green)] bg-[var(--color-green)]/10 border-[var(--color-green)]/20"}`}>
                    {s.paymentStatus === "unpaid" ? "Unpaid" : "Paid"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

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
