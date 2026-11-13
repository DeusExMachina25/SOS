"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { bookSession, getOrCreateThread, getCurrentUserId, getExpertAvailabilityRules, getExpertBusyRanges } from "@/lib/data/queries";
import { generateSlotsForDate, todayDateInput, dayBoundsUtc, describeTimeZone, resolveTimeZone, type Slot } from "@/lib/data/slots";
import { formatInr } from "@/lib/data/format";
import type { Session, Expert, AvailabilityRule } from "@/lib/data/types";
import Receipt from "@/components/dashboard/Receipt";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  experts: Expert[];
  /** Preselected expert: the one picked on Platter, or the client's last expert */
  defaultExpert: Expert | null;
  /** Called with the new session once it is saved; the parent opens the payment step */
  onBooked: (session: Session) => void;
}

/**
 * Booking a session, in two steps: choose type, expert, date and time,
 * then check a receipt-style summary. Moved out of the client Overview so
 * that page only lays out the dashboard.
 */
export default function BookingModal({ open, onClose, experts: dbExperts, defaultExpert: currentExpert, onBooked }: BookingModalProps) {
  const isBooking = open;
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [rulesByExpert, setRulesByExpert] = useState<Record<string, AvailabilityRule[]>>({});

  const [sessionType, setSessionType] = useState("Architecture Review");
  const [sessionDate, setSessionDate] = useState(todayDateInput());
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  // Two steps: fill in the form, then check a receipt-style summary.
  const [bookingStep, setBookingStep] = useState<"form" | "review">("form");

  // Each time the modal opens: start at step 1, and preselect the default expert if none is chosen.
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset the form each time the modal opens */
    setBookingStep("form");
    setBookingError("");
    setSelectedExpertId((id) => id || currentExpert?.id || "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, currentExpert]);

  const setIsBooking = (next: boolean) => {
    if (!next) onClose();
  };
  // Availability is written in the expert's timezone, so that is the clock a date and its times are read on.
  const expertZone = resolveTimeZone((dbExperts.find((e) => e.id === selectedExpertId) ?? currentExpert)?.timezone);

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
        const bounds = dayBoundsUtc(sessionDate, expertZone);
        if (!bounds) {
          if (!cancelled) {
            setSlots([]);
            setSlotsState("ready");
          }
          return;
        }
        const busy = await getExpertBusyRanges(selectedExpertId, bounds.from, bounds.to);
        if (cancelled) return;
        setSlots(generateSlotsForDate(sessionDate, rules, busy, 60, expertZone));
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
  }, [isBooking, selectedExpertId, sessionDate, expertZone]);

  // Step 1 → 2: check the choices, then show the summary. Nothing is saved yet.
  const handleReviewBooking = () => {
    const targetExpert = dbExperts.find(e => e.id === selectedExpertId) ?? currentExpert;
    if (!targetExpert) {
      setBookingError("Choose an expert before booking.");
      return;
    }
    if (!slots.some((t) => t.startsAt === selectedSlot)) {
      setBookingError("Choose one of the available times.");
      return;
    }
    setBookingError("");
    setBookingStep("review");
  };

  const handleConfirmBooking = async () => {
    const targetExpert = dbExperts.find(e => e.id === selectedExpertId) ?? currentExpert;
    if (!targetExpert) {
      setBookingError("Choose an expert before booking.");
      return;
    }

    // The slot carries its own absolute start; nothing is re-derived from a label.
    const chosen = slots.find((t) => t.startsAt === selectedSlot);
    if (!chosen) {
      setBookingError("Choose one of the available times.");
      return;
    }

    setBookingError("");
    setBookingSubmitting(true);
    try {
      const created = await bookSession({
        expertId: targetExpert.id,
        title: sessionType,
        startsAt: chosen.startsAt,
        durationMinutes: 60,
      });

      // Best-effort: open a chat thread with the expert so Messages isn't
      // empty right after booking. Never block the booking on this.
      getCurrentUserId()
        .then((uid) => (uid ? getOrCreateThread(uid, targetExpert.id) : null))
        .catch((err) => console.error("Failed to open chat thread", err));

      onClose();
      onBooked(created);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book session");
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
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
              
              {bookingStep === "review" ? (
                <BookingReview
                  expert={dbExperts.find((e) => e.id === selectedExpertId) ?? currentExpert}
                  sessionType={sessionType}
                  slot={slots.find((t) => t.startsAt === selectedSlot) ?? null}
                  sessionDate={sessionDate}
                  zoneLabel={describeTimeZone(expertZone)}
                  error={bookingError}
                  submitting={bookingSubmitting}
                  onBack={() => setBookingStep("form")}
                  onConfirm={handleConfirmBooking}
                />
              ) : (
              <>
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
                    <span className="block text-xs font-mono-sos text-[var(--text-faint)] mb-1 tracking-widest">AVAILABLE TIMES</span>
                    <span className="block text-[11px] text-[var(--text-faint)] mb-3">
                      The date and times are in {describeTimeZone(expertZone)}, your expert&apos;s timezone.
                    </span>
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
                            key={t.startsAt}
                            type="button"
                            role="radio"
                            aria-checked={selectedSlot === t.startsAt}
                            onClick={() => setSelectedSlot(t.startsAt)}
                            className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                              selectedSlot === t.startsAt
                                ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)]"
                                : "bg-[var(--bg-base)] text-[var(--text-primary)] border-[var(--border-strong)] hover:border-[var(--color-primary)]"
                            }`}
                          >
                            {t.label}
                            {t.viewerLabel && (
                              <span className="block text-[10px] font-normal opacity-70 mt-0.5">{t.viewerLabel} for you</span>
                            )}
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
                onClick={handleReviewBooking}
                disabled={slotsState !== "ready"}
                className="btn-sos-filled w-full py-5 text-lg text-center justify-center rounded-2xl tracking-widest mt-8 shadow-lg disabled:opacity-50"
              >
                Review Booking
              </button>
              </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}

/** Step 2 of booking: a receipt of what the client is about to book, before anything is saved or paid. */
function BookingReview({
  expert,
  sessionType,
  slot,
  sessionDate,
  zoneLabel,
  error,
  submitting,
  onBack,
  onConfirm,
}: {
  expert: Expert | null;
  sessionType: string;
  slot: Slot | null;
  sessionDate: string;
  zoneLabel: string;
  error: string;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const fee = expert?.sessionRateInr ?? null;
  const dateLabel = new Date(`${sessionDate}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <div className="max-h-[55vh] overflow-y-auto scrollbar-thin -mx-1 px-1">
        <Receipt
          heading="Booking summary"
          details={[
            { label: "Expert", value: expert?.fullName ?? "—" },
            { label: "Session", value: sessionType },
            { label: "Date", value: dateLabel },
            { label: "Time", value: slot ? `${slot.label}${slot.viewerLabel ? ` (${slot.viewerLabel} for you)` : ""}` : "—" },
            { label: "Timezone", value: zoneLabel },
            { label: "Duration", value: "60 min" },
          ]}
          lines={[{ label: "Session fee (1 × 60 min)", value: formatInr(fee) }]}
          total={{ label: "Due now", value: formatInr(fee) }}
          stamp={{ text: "Not paid", tone: "due" }}
          note="Nothing is charged yet. You'll choose how to pay on the next step, and your payment is held until the session is delivered."
        />
      </div>

      {error && <p className="text-sm text-[var(--color-orange)] font-mono-sos mt-6 text-center">{error}</p>}

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 border border-[var(--border-strong)] rounded-2xl py-4 font-mono-sos text-xs tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="btn-sos-filled flex-[2] py-4 text-sm text-center justify-center rounded-2xl tracking-widest disabled:opacity-50"
        >
          {submitting ? "Booking…" : "Confirm & pay"}
        </button>
      </div>
    </div>
  );
}
