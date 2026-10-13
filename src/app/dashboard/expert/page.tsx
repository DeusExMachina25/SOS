"use client";

import { useState, useEffect } from "react";
import { Clock, Video, Timer, Wallet, BellRing, CalendarCheck } from "lucide-react";
import Link from "next/link";
import {
  getMyProfile,
  getMySessions,
  getMyPayments,
  getMyAvailabilityRules,
  getMyExpertProfile,
  getCurrentUserId,
  getExpertBusyRanges,
} from "@/lib/data/queries";
import { generateSlotsForDate, dayBoundsUtc, dateInputInZone, addDaysToDateInput } from "@/lib/data/slots";
import { formatInr } from "@/lib/data/format";
import type { Session, Payment } from "@/lib/data/types";
import HoursLineChart from "@/components/dashboard/HoursLineChart";
import StatTile from "@/components/dashboard/StatTile";
import Panel from "@/components/dashboard/Panel";
import ClientRoster from "@/components/dashboard/ClientRoster";
import { monthDelta } from "@/components/dashboard/metrics";

export default function ExpertDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expertName, setExpertName] = useState("");
  const [loadError, setLoadError] = useState("");
  // null = not loaded (or failed); the tile then says so instead of showing 0
  const [openSlots, setOpenSlots] = useState<number | null>(null);

  useEffect(() => {
    async function loadExpertDashboard() {
      try {
        const [profile, mySessions, myPayments] = await Promise.all([
          getMyProfile(),
          getMySessions(),
          getMyPayments(),
        ]);
        if (profile) setExpertName(profile.fullName);
        setSessions(mySessions);
        setPayments(myPayments);
      } catch (err) {
        console.error("Error loading expert dashboard data", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    }

    // Bookable hours over the next 14 days — kept separate so a failure here never blanks the overview.
    async function loadOpenSlots() {
      try {
        const [rules, uid, profile] = await Promise.all([
          getMyAvailabilityRules(),
          getCurrentUserId(),
          getMyExpertProfile(),
        ]);
        if (!uid) return;
        // Count on the same clock clients book on: the expert's own timezone.
        const zone = profile?.timezone;
        const firstDay = dateInputInZone(Date.now(), zone);
        const lastDay = addDaysToDateInput(firstDay, 14);
        const from = dayBoundsUtc(firstDay, zone);
        const to = dayBoundsUtc(lastDay, zone);
        if (!from || !to) return;
        const busy = await getExpertBusyRanges(uid, from.from, to.from);
        let count = 0;
        for (let i = 0; i < 14; i++) {
          count += generateSlotsForDate(addDaysToDateInput(firstDay, i), rules, busy, 60, zone).length;
        }
        setOpenSlots(count);
      } catch (err) {
        console.error("Error loading open slots", err);
      }
    }

    loadExpertDashboard();
    loadOpenSlots();
  }, []);

  // Sessions are already scoped to the signed-in expert by RLS — no client-side filter needed.
  const nextSession = sessions.find(s => s.status === "scheduled");

  const completed = sessions.filter(s => s.status === "completed");
  const totalHours = completed.reduce((n, s) => n + s.durationMinutes, 0) / 60;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayHours = last7.map(d => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const mins = completed
      .filter(s => s.startsAt && new Date(s.startsAt) >= d && new Date(s.startsAt) < next)
      .reduce((n, s) => n + s.durationMinutes, 0);
    return mins / 60;
  });
  const dayLabels = last7.map(d => d.toLocaleDateString("en-US", { weekday: "short" }));
  const earned = payments.filter(p => p.status === "paid").reduce((n, p) => n + p.amountInr, 0);
  const toConfirm = payments.filter(p => p.status === "processing").length;

  const hoursDelta = monthDelta(
    completed.map(x => ({ at: x.startsAt, value: x.durationMinutes / 60 }))
  );

  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)]">
          Welcome back{expertName ? `, ${expertName}` : ""}
        </p>
        {loadError && <p className="font-mono-sos text-xs text-[var(--color-orange)] mt-2">{loadError}</p>}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="HOURS" value={totalHours.toFixed(1)} unit="hrs" icon={Timer} delta={hoursDelta} note="Completed consultations" />
        <StatTile label="EARNED" value={formatInr(earned)} icon={Wallet} note="Paid by clients" />
        <div className={toConfirm > 0 ? "border border-[var(--color-primary)]" : ""}>
          <StatTile label="TO CONFIRM" value={String(toConfirm)} unit={toConfirm === 1 ? "payment" : "payments"} icon={BellRing} note="UPI payments awaiting you" />
        </div>
        <StatTile
          label="OPEN SLOTS"
          value={openSlots === null ? "—" : String(openSlots)}
          unit={openSlots === null ? undefined : "next 14 days"}
          icon={CalendarCheck}
          note={openSlots === null ? "Availability unavailable" : openSlots === 0 ? "Set your weekly hours" : "Bookable by clients"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Hours consulted" subtitle="LAST 7 DAYS" className="xl:col-span-2">
          <HoursLineChart data={dayHours} days={dayLabels} />
        </Panel>

        <Panel title="Next consultation" subtitle="UP NEXT" href="/dashboard/expert/sessions">
          {nextSession ? (
            <div className="flex flex-col h-full gap-4">
              <div>
                <h3 className="font-editorial text-2xl text-[var(--text-primary)] leading-tight">{nextSession.title}</h3>
                <p className="font-mono-sos text-[11px] text-[var(--color-primary)] flex items-center gap-2 mt-3">
                  <Clock size={13} /> {nextSession.date} • {nextSession.time}
                </p>
                <p className="font-inter text-xs text-[var(--text-muted)] mt-2">Client: {nextSession.clientName}</p>
              </div>
              <div className="mt-auto">
                {nextSession.paymentStatus === "unpaid" ? (
                  <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] border border-dashed border-[var(--border)] px-4 py-4 text-center">
                    The call room opens once the client has paid
                  </p>
                ) : (
                  <Link
                    href={`/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.title)}`}
                    className="group/join flex w-full items-center justify-center gap-2 border border-[var(--border-strong)] bg-[var(--bg-surface-2)] py-3.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:border-[var(--color-primary)]"
                  >
                    <Video size={14} className="text-[var(--text-muted)] group-hover/join:text-[var(--color-primary)] transition-colors" /> START VIDEO CALL
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">NO SCHEDULED CONSULTATIONS</p>
              <Link href="/dashboard/expert/sessions" className="mt-4 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--color-primary)] hover:underline">
                VIEW ALL SESSIONS &rarr;
              </Link>
            </div>
          )}
        </Panel>

        <Panel
          title="Your clients"
          subtitle="ROSTER"
          className="xl:col-span-3"
        >
          <ClientRoster sessions={sessions} />
        </Panel>
      </div>
    </div>
  );
}
