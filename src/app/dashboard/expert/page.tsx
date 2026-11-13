"use client";

import { useState, useEffect } from "react";
import { CalendarClock, DraftingCompass } from "lucide-react";
import {
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
import { isoToDayKey, relativeDay } from "@/lib/data/calendar";
import HoursLineChart from "@/components/dashboard/HoursLineChart";
import StatTile from "@/components/dashboard/StatTile";
import Panel from "@/components/dashboard/Panel";
import TodayCard from "@/components/dashboard/TodayCard";
import ProgressCard from "@/components/dashboard/ProgressCard";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import ScheduleList from "@/components/dashboard/ScheduleList";
import SectionHeading from "@/components/dashboard/SectionHeading";
import { toneAt } from "@/components/dashboard/tones";
import { monthDelta } from "@/components/dashboard/metrics";

/**
 * Expert Overview, in the same layout as the client's: what needs you,
 * your practice in numbers, one progress card per client, and on the
 * right a calendar with your upcoming consultations.
 */
export default function ExpertDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState("");
  // null = not loaded (or failed); the tile then says so instead of showing 0
  const [openSlots, setOpenSlots] = useState<number | null>(null);

  useEffect(() => {
    async function loadExpertDashboard() {
      try {
        const [mySessions, myPayments] = await Promise.all([
          getMySessions(),
          getMyPayments(),
        ]);
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

  const live = sessions.filter(s => s.status !== "cancelled");
  const upcoming = sessions.filter(s => s.status === "scheduled");
  const awaitingClientPay = live.filter(s => s.paymentStatus === "unpaid" && (s.amountInr ?? 0) > 0);
  const toDays = (list: Session[]) =>
    new Set(list.map(s => isoToDayKey(s.startsAt)).filter((k): k is string => !!k));

  // One progress card per client, like the client's per-expert cards.
  const clients = (() => {
    const byClient = new Map<string, Session[]>();
    for (const s of live) byClient.set(s.clientId, [...(byClient.get(s.clientId) ?? []), s]);
    return [...byClient.entries()].map(([clientId, list]) => {
      const billable = list.filter(s => (s.amountInr ?? 0) > 0);
      const next = list.filter(s => s.status === "scheduled").sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))[0];
      return {
        clientId,
        name: list[0].clientName,
        done: list.filter(s => s.status === "completed").length,
        total: list.length,
        paidPct: billable.length ? (billable.filter(s => s.paymentStatus !== "unpaid").length / billable.length) * 100 : 100,
        next,
      };
    });
  })();

  const plateCount = upcoming.length + toConfirm;

  return (
    <div className="grid grid-cols-1 gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      {/* ── Main column ─────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-10">
        {loadError && <p className="font-mono-sos text-xs text-[var(--color-orange)]">{loadError}</p>}

        <section aria-labelledby="today-heading" className="flex flex-col gap-5">
          <SectionHeading id="today-heading" count={plateCount}>On your plate</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {nextSession ? (
              <TodayCard
                tone={1}
                eyebrow={`${nextSession.date} • ${nextSession.time}`}
                title={nextSession.title}
                status={nextSession.paymentStatus === "unpaid" ? "Awaiting payment" : relativeDay(nextSession.startsAt) || "Booked"}
                people={[nextSession.clientName]}
                {...(nextSession.paymentStatus === "unpaid"
                  ? { actionLabel: "Open sessions", href: "/dashboard/expert/sessions" }
                  : {
                      actionLabel: `Start the call for ${nextSession.title}`,
                      href: `/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.title)}`,
                    })}
              />
            ) : (
              <TodayCard
                tone={1}
                eyebrow="Nothing scheduled"
                title="No consultations booked yet"
                actionLabel="Open sessions"
                href="/dashboard/expert/sessions"
              />
            )}

            {toConfirm > 0 ? (
              <TodayCard
                tone={4}
                eyebrow="UPI payments"
                title={`${toConfirm} ${toConfirm === 1 ? "payment" : "payments"} to confirm`}
                status="Needs you"
                actionLabel="Confirm payments"
                href="/dashboard/expert/sessions"
              />
            ) : (
              <TodayCard
                tone={4}
                eyebrow="Availability • next 14 days"
                title={
                  openSlots === null
                    ? "Check your weekly hours"
                    : openSlots === 0
                    ? "Set your weekly hours so clients can book"
                    : `${openSlots} open ${openSlots === 1 ? "slot" : "slots"} for clients`
                }
                actionLabel="Edit availability"
                href="/dashboard/expert/availability"
              />
            )}
          </div>
        </section>

        <section aria-labelledby="practice-heading" className="flex flex-col gap-5">
          <SectionHeading id="practice-heading">Your practice</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile tone={1} label="Hours" value={totalHours.toFixed(1)} unit="hrs" delta={hoursDelta} note="Completed consultations" href="/dashboard/expert/sessions" />
            <StatTile tone={3} label="Earned" value={formatInr(earned)} note="Paid by clients" href="/dashboard/expert/sessions" />
            <StatTile
              tone={2}
              label="Open slots"
              value={openSlots === null ? "—" : String(openSlots)}
              unit={openSlots === null ? undefined : "next 14 days"}
              note={openSlots === null ? "Availability unavailable" : openSlots === 0 ? "Set your weekly hours" : "Bookable by clients"}
              href="/dashboard/expert/availability"
            />
          </div>

          {clients.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {clients.map((c, i) => (
                <ProgressCard
                  key={c.clientId}
                  tone={toneAt(i + 2)}
                  icon={DraftingCompass}
                  category={c.next ? `Next: ${c.next.date} • ${c.next.time}` : "No upcoming session"}
                  meta={`${c.done} of ${c.total} ${c.total === 1 ? "session" : "sessions"} done`}
                  title={c.name}
                  bars={[
                    { label: "Sessions done", pct: c.total ? (c.done / c.total) * 100 : 0 },
                    { label: "Paid", pct: c.paidPct },
                  ]}
                  href="/dashboard/expert/sessions"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Right column ────────────────────────────── */}
      <aside aria-labelledby="schedule-heading" className="flex min-w-0 flex-col gap-5">
        <SectionHeading id="schedule-heading">Schedule</SectionHeading>
        <MiniCalendar
          sessionDays={toDays(live)}
          dueDays={toDays(awaitingClientPay)}
          legend={{ session: "Consultation", due: "Awaiting payment" }}
        />
        <h3 className="mt-2 font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)]">Coming up</h3>
        <ScheduleList
          empty="No upcoming consultations."
          items={upcoming.slice(0, 5).map((s, i) => ({
            id: s.id,
            icon: CalendarClock,
            title: s.title,
            detail: `${s.clientName} • ${s.time}`,
            when: relativeDay(s.startsAt) || s.date,
            href: "/dashboard/expert/sessions",
            tone: toneAt(i),
          }))}
        />
        <Panel title="Hours consulted" subtitle="LAST 7 DAYS" className="mt-2">
          <HoursLineChart data={dayHours} days={dayLabels} />
        </Panel>
      </aside>
    </div>
  );
}
