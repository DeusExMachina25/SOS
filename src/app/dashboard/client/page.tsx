"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Video, X, Star, MapPin, Clock, Bell, AlertTriangle, CreditCard, ArrowRight, ShieldAlert, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PaymentModal from "@/components/dashboard/PaymentModal";
import {
  getMySessions,
  bookSession,
  getApprovedExperts,
  getOrCreateThread,
  sendMessage,
  getExpertAvailabilityRules,
  getExpertBusyRanges,
} from "@/lib/data/queries";
import type { Session, Expert } from "@/lib/data/types";
import { toScheduledAtIso } from "@/lib/data/format";
import { generateSlotsForDate, todayDateInput } from "@/lib/data/slots";

/** Real, bookable time slots for the selected expert + date. */
function SlotPicker({
  expertId,
  dateInput,
  selectedTime,
  onSelect,
}: {
  expertId: string;
  dateInput: string;
  selectedTime: string;
  onSelect: (time: string) => void;
}) {
  const [slots, setSlots] = useState<string[] | null>(null);

  useEffect(() => {
    // SlotPicker is only ever rendered once an expert is selected, and
    // `dateInput` always carries a default, so both are guaranteed here.
    let active = true;
    (async () => {
      setSlots(null);
      try {
        const dayStart = new Date(dateInput + "T00:00:00");
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60000);
        const [rules, busy] = await Promise.all([
          getExpertAvailabilityRules(expertId),
          getExpertBusyRanges(expertId, dayStart.toISOString(), dayEnd.toISOString()),
        ]);
        if (active) setSlots(generateSlotsForDate(dateInput, rules, busy));
      } catch (err) {
        console.error(err);
        if (active) setSlots([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [expertId, dateInput]);

  if (slots === null) {
    return (
      <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest py-4">Loading available times...</p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest py-4">No availability on this date. Try another date.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onSelect(slot)}
          className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all border ${
            selectedTime === slot
              ? "bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--text-primary)]"
              : "bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}

export default function ClientDashboard() {
  const [isBooking, setIsBooking] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  // Bumped every time the modal opens, forcing SlotPicker to remount and
  // refetch even if expert/date are unchanged from the last time it was
  // open — otherwise a slot booked (by this user or anyone else) while the
  // modal was briefly closed can keep showing as available.
  const [bookingOpenKey, setBookingOpenKey] = useState(0);

  const [sessionType, setSessionType] = useState("Architecture Review");
  const [sessionDate, setSessionDate] = useState(todayDateInput());
  const [selectedExpertId, setSelectedExpertId] = useState("");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [payingSession, setPayingSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [mySessions, approvedExperts] = await Promise.all([
          getMySessions(),
          getApprovedExperts(),
        ]);
        setSessions(mySessions);
        setExperts(approvedExperts);
        setSelectedExpertId((prev) => prev || approvedExperts[0]?.id || "");
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const primaryExpert = experts[0] ?? null;

  const handleConfirmBooking = async () => {
    if (!selectedExpertId) {
      setBookingError("No expert selected.");
      return;
    }
    if (!selectedTime) {
      setBookingError("Select an available time slot.");
      return;
    }
    const startsAt = toScheduledAtIso(sessionDate, selectedTime);
    if (!startsAt) {
      setBookingError("Invalid date or time.");
      return;
    }

    setIsSubmitting(true);
    setBookingError("");
    try {
      const expert = experts.find((e) => e.id === selectedExpertId);
      const newSession = await bookSession({
        expertId: selectedExpertId,
        title: sessionType,
        startsAt,
        durationMinutes: 60,
        amountInr: expert?.sessionRateInr ?? null,
      });
      setSessions((prev) => [newSession, ...prev]);

      // Notify the expert in chat that a session was booked.
      try {
        const threadId = await getOrCreateThread(newSession.clientId, selectedExpertId);
        await sendMessage(
          threadId,
          `Hello! I just booked a new session: "${sessionType}" for ${newSession.date} at ${newSession.time}.`
        );
      } catch (chatErr) {
        console.error("Booking succeeded but chat notification failed:", chatErr);
      }

      setIsBooking(false);
      setSelectedTime("");
      setPayingSession(newSession);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book session");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="w-full h-full relative min-h-screen flex flex-col pb-24">
      {/* 1. HEADER SECTION & NOTIFICATIONS */}
      <header className="mb-12 mt-4 flex flex-row justify-between items-end gap-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">Overview</h1>
          <p className="font-mono-sos text-sm text-[var(--text-faint)] mt-2 tracking-widest uppercase">Welcome back, Client</p>
        </div>
        <div className="flex gap-4 items-center">
          {/* Notification Bell */}
          <button className="relative p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-cyan-400 transition-colors group shadow-lg">
            <Bell size={24} className="text-[var(--text-muted)] group-hover:text-cyan-400 transition-colors" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-[#ff5c5c] rounded-full border-2 border-[var(--bg-surface)] animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* 2. THREE COLUMN LAYOUT FOR MAXIMUM REAL ESTATE */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 flex-1 w-full">
        
        {/* COLUMN 1: FINANCIALS & OPERATIONS */}
        <div className="flex flex-col gap-8">
          
          {/* FINANCIAL STATUS WIDGET */}
          <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex-1">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
            <div className="flex justify-between items-start mb-8 pl-2">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Financial Status</h3>
              <button className="text-[10px] font-bold text-[var(--text-muted)] hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-1">View Invoices <ArrowRight size={12} /></button>
            </div>
            
            <div className="flex flex-col gap-8 pl-2">
              <div className="w-full">
                <p className="text-sm font-inter text-[var(--text-muted)] font-semibold mb-1">Retainer Balance</p>
                <h2 className="font-display text-4xl font-bold text-[var(--text-primary)]">₹15,000<span className="text-lg text-[var(--text-faint)]">.00</span></h2>
                
                <div className="mt-8 mb-2 flex justify-between text-xs font-inter font-bold text-[var(--text-muted)]">
                  <span>Budget Burn Rate</span>
                  <span className="text-emerald-400">42% Used</span>
                </div>
                {/* Dual Progress Bar */}
                <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden relative border border-[var(--border)]">
                  <div className="absolute top-0 left-0 h-full w-[65%] bg-[var(--bg-surface-2)]"></div> {/* Project % */}
                  <div className="absolute top-0 left-0 h-full w-[42%] bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div> {/* Burn Rate */}
                </div>
                <p className="text-[10px] text-[var(--text-faint)] mt-2 tracking-wide text-right font-mono-sos">PROJECT COMPLETION: 65%</p>
              </div>

              <div className="w-full flex flex-col gap-3 mt-auto">
                <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl flex items-center justify-between group/approval cursor-pointer hover:border-orange-400 transition-all shadow-inner">
                  <div className="flex items-center gap-3 text-sm font-semibold text-[var(--text-muted)] group-hover/approval:text-orange-400 transition-colors">
                    <AlertTriangle size={16} /> 1 Pending Approval
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">₹5,000</span>
                </div>
                <button className="w-full py-4 bg-[var(--bg-surface-2)] hover:bg-[#1f3763]/20 border border-[var(--border-strong)] text-[var(--text-primary)] rounded-2xl text-sm font-bold transition-all hover:border-[#3395ff] flex items-center justify-center gap-2 group/topup">
                  <CreditCard size={16} className="text-[var(--text-muted)] group-hover/topup:text-[#3395ff] transition-colors" /> Top-Up via Razorpay
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: MEETINGS & SECURE VAULT */}
        <div className="flex flex-col gap-8">
            {/* NEXT SESSION CARD */}
            <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group flex flex-col min-h-[300px] shadow-lg">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
              <h3 className="text-xs font-mono-sos mb-6 text-[var(--text-faint)] tracking-widest uppercase pl-2">Next Session</h3>
              {sessions.filter(s => s.status === 'scheduled').length > 0 ? (
                sessions.filter(s => s.status === 'scheduled').slice(0,1).map(session => (
                  <div key={session.id} className="flex flex-col h-full pl-2">
                    <h2 className="font-display text-3xl font-bold mb-2 text-[var(--text-primary)]">{session.title}</h2>
                    <p className="text-sm text-purple-400 font-mono-sos flex items-center gap-2 mb-auto">
                      <Clock size={14} /> {session.date} • {session.time}
                    </p>

                    <p className="text-xs text-[var(--text-muted)] font-inter mb-4">
                      Expert: {session.expertName}
                    </p>

                    <div className="w-full mt-auto space-y-3">
                      {session.paymentStatus === "unpaid" && (
                        <button
                          onClick={() => setPayingSession(session)}
                          className="w-full flex items-center justify-center gap-2 bg-orange-400/10 hover:bg-orange-400/20 border border-orange-400/40 text-orange-400 py-4 rounded-2xl text-sm font-bold transition-all"
                        >
                          <CreditCard size={16} /> Complete Payment
                        </button>
                      )}
                      <Link
                        href={`/dashboard/video-call?sessionId=${session.id}&sessionName=${encodeURIComponent(session.title)}`}
                        className="w-full flex items-center justify-center gap-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] py-4 rounded-2xl text-sm font-bold transition-all hover:border-purple-400 group/join"
                      >
                        <Video size={16} className="text-[var(--text-muted)] group-hover/join:text-purple-400 transition-colors" /> Join Video Call
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">No Scheduled Sessions</p>
                  <button onClick={() => { setIsBooking(true); setBookingOpenKey((k) => k + 1); }} className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider">Book Now &rarr;</button>
                </div>
              )}
            </div>

            {/* SECURE VAULT WIDGET */}
            <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col flex-1 shadow-lg relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-cyan-600"></div>
              <div className="flex justify-between items-center mb-6 pl-2">
                <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Secure Vault</h3>
                <Link href="/dashboard/client/vault" className="text-[10px] font-bold text-[var(--text-muted)] hover:text-cyan-400 transition-colors uppercase tracking-widest flex items-center gap-1">Open <ArrowRight size={10}/></Link>
              </div>
              <div className="space-y-4 flex-1 flex flex-col justify-center pl-2">
                <div className="p-4 border border-[var(--border)] rounded-2xl flex items-center gap-4 bg-[var(--bg-surface)] hover:border-cyan-400/50 transition-colors cursor-pointer group/file">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-strong)] flex items-center justify-center text-[9px] font-bold text-cyan-400 group-hover/file:bg-cyan-400/10 transition-colors">PDF</div>
                  <div className="truncate text-sm font-semibold text-[var(--text-muted)] group-hover/file:text-[var(--text-primary)] transition-colors">Floorplan_V2.pdf</div>
                </div>
                <div className="p-4 border border-[var(--border)] rounded-2xl flex items-center gap-4 bg-[var(--bg-surface)] hover:border-cyan-400/50 transition-colors cursor-pointer group/file">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-strong)] flex items-center justify-center text-[9px] font-bold text-cyan-400 group-hover/file:bg-cyan-400/10 transition-colors">IMG</div>
                  <div className="truncate text-sm font-semibold text-[var(--text-muted)] group-hover/file:text-[var(--text-primary)] transition-colors">Site_Photos.zip</div>
                </div>
              </div>
            </div>
        </div>

        {/* COLUMN 3: THE EXPERT HUB */}
        <div className="flex flex-col gap-6">
          
          {/* EXPERT PROFILE CARD */}
          <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col relative overflow-hidden shadow-lg h-[400px]">
            {/* SOS Panic Button */}
            <button className="absolute top-6 right-6 p-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[#ff5c5c]/10 hover:border-[#ff5c5c]/50 transition-all group/sos shadow-md" title="Trigger SOS Emergency Alert">
              <ShieldAlert size={20} className="text-[#ff5c5c]/70 group-hover/sos:text-[#ff5c5c] transition-colors" />
            </button>

            <h3 className="text-xs font-mono-sos mb-6 text-[var(--text-faint)] tracking-widest uppercase w-full text-left">Your Expert Hub</h3>
            
            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 rounded-full p-1 border border-[var(--border-strong)] relative shrink-0">
                <div className="w-full h-full rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center overflow-hidden">
                  <Star size={24} className="text-[var(--color-primary)] opacity-50" />
                </div>
                {/* Online Indicator */}
                <div className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-400 border-[3px] border-[var(--bg-base)] rounded-full"></div>
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-1 truncate">{primaryExpert?.fullName ?? "No Expert Assigned"}</h2>
                <p className="text-xs font-inter text-[var(--color-primary)] font-semibold mb-2 truncate">{primaryExpert?.professionalTitle ?? "—"}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono-sos mt-1">
                  <MapPin size={10} className="text-[var(--text-faint)] shrink-0" /> <span className="truncate">{primaryExpert?.location ?? "—"}</span>
                </div>
              </div>
            </div>

            {/* Centralized Booking */}
            <button onClick={() => { setIsBooking(true); setBookingOpenKey((k) => k + 1); }} className="w-full btn-sos-filled py-4 text-sm tracking-widest rounded-2xl shadow-[0_10px_20px_rgba(var(--color-primary-rgb),0.2)] mb-auto">
              Book New Session
            </button>
            
            {/* Sent Invitations / Requests */}
            <div className="mt-8">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-mono-sos text-[var(--text-faint)] uppercase tracking-widest">Pending</span>
                <span className="text-[var(--text-muted)] flex items-center gap-1"><MoreHorizontal size={12}/> 1</span>
              </div>
              <div className="bg-[var(--bg-surface-2)] rounded-2xl p-4 border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] flex items-center justify-between shadow-inner">
                 <span>Follow-up Call</span>
                 <span className="text-[9px] uppercase tracking-widest font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full border border-orange-400/20">Awaiting</span>
              </div>
            </div>
          </div>

          {/* INTEGRATED MESSAGING */}
          <div className="glass-panel p-6 rounded-[32px] border border-[var(--border-strong)] flex flex-col relative overflow-hidden shadow-lg flex-1">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-400 to-pink-600"></div>
            <div className="flex justify-between items-center mb-4 pl-2">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase flex items-center gap-2"><MessageSquare size={12} className="text-pink-400"/> Recent Messages</h3>
              <Link href="/dashboard/client/chat" className="text-[10px] font-bold text-[var(--text-muted)] hover:text-pink-400 transition-colors uppercase tracking-widest flex items-center gap-1">Open Chat <ArrowRight size={10}/></Link>
            </div>
            <div className="pl-2 flex flex-col gap-3 h-full">
              <div className="bg-[var(--bg-surface-2)] border border-[var(--border-strong)] p-5 rounded-2xl rounded-tl-sm text-sm text-[var(--text-muted)] leading-relaxed relative shadow-inner flex-1 flex items-center">
                <p>Please upload the latest blueprints to the vault before our next session so I can review the changes.</p>
                <span className="absolute -bottom-4 left-2 text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest">TODAY • 10:42 AM</span>
              </div>
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
              className="glass-panel p-10 max-w-lg w-full relative border-organic shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
            >
              <button 
                onClick={() => setIsBooking(false)}
                className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-display text-4xl font-bold mb-4 text-embossed">Book a Session</h2>
              <p className="text-lg text-[var(--text-muted)] mb-10">Select a date and time to meet with your expert.</p>
              
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
                  <select value={selectedExpertId} onChange={(e) => { setSelectedExpertId(e.target.value); setSelectedTime(""); }} className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer">
                    {experts.length === 0 && <option value="">No approved experts yet</option>}
                    {experts.map((expert) => (
                      <option key={expert.id} value={expert.id}>{expert.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">DATE</label>
                  <input type="date" min={todayDateInput()} value={sessionDate} onChange={(e) => { setSessionDate(e.target.value); setSelectedTime(""); }} className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] [color-scheme:dark] transition-colors shadow-inner" />
                </div>
                <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Clock size={12} className="text-[var(--color-primary)]" /> AVAILABLE TIMES</label>
                  {selectedExpertId ? (
                    <SlotPicker
                      key={`${bookingOpenKey}-${selectedExpertId}-${sessionDate}`}
                      expertId={selectedExpertId}
                      dateInput={sessionDate}
                      selectedTime={selectedTime}
                      onSelect={setSelectedTime}
                    />
                  ) : (
                    <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest py-4">Select an expert first.</p>
                  )}
                </div>
              </div>

              {bookingError && (
                <p className="text-sm text-red-400 font-mono-sos mb-4 text-center">{bookingError}</p>
              )}

              <button
                onClick={handleConfirmBooking}
                disabled={isSubmitting || !selectedExpertId}
                className="btn-sos-filled w-full py-5 text-lg text-center justify-center rounded-2xl tracking-widest mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Booking..." : "Confirm Booking"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {payingSession && (
        <PaymentModal
          sessionId={payingSession.id}
          amountInr={payingSession.amountInr}
          expertName={payingSession.expertName}
          expertUpiId={experts.find((e) => e.id === payingSession.expertId)?.upiId ?? null}
          onClose={() => setPayingSession(null)}
          onPaid={(payment) => {
            // Only the mocked-Razorpay path resolves immediately; a direct
            // UPI payment stays "unpaid" until the expert confirms receipt.
            if (payment.method === "razorpay_mock" && payment.status === "paid") {
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === payingSession.id ? { ...s, paymentStatus: "escrow_held" } : s
                )
              );
            }
          }}
        />
      )}
    </div>
  );
}
