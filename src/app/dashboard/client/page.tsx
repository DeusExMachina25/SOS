"use client";

import { useState, useEffect } from "react";
import { CalendarClock, MessageSquare, FileText, Video, DraftingCompass } from "lucide-react";
import {
  getApprovedExperts,
  getMySessions,
  getMyChatThreads,
  getMyVaultFiles,
} from "@/lib/data/queries";
import { formatInr, formatFileSize, formatMessageTime } from "@/lib/data/format";
import { isoToDayKey, relativeDay } from "@/lib/data/calendar";
import type { Session, Expert, ChatThreadSummary, VaultFile } from "@/lib/data/types";
import PaymentModal from "@/components/dashboard/PaymentModal";
import BookingModal from "@/components/dashboard/BookingModal";
import StatTile from "@/components/dashboard/StatTile";
import TodayCard from "@/components/dashboard/TodayCard";
import ProgressCard from "@/components/dashboard/ProgressCard";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import ScheduleList, { type ScheduleItem } from "@/components/dashboard/ScheduleList";
import SectionHeading from "@/components/dashboard/SectionHeading";
import { toneAt } from "@/components/dashboard/tones";
import { monthDelta } from "@/components/dashboard/metrics";

const callHref = (s: Session) =>
  `/dashboard/video-call?sessionId=${s.id}&sessionName=${encodeURIComponent(s.title)}`;

/**
 * Client Overview. Layout: what needs you today, your project in numbers,
 * one progress card per expert; on the right, a calendar and what is coming up.
 * The welcome heading, search and account live in the shared TopBar.
 */
export default function ClientDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [currentExpert, setCurrentExpert] = useState<Expert | null>(null);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loadError, setLoadError] = useState("");

  const [isBooking, setIsBooking] = useState(false);
  // Payment step, shown after a successful booking or from a "pay" arrow.
  const [paymentSession, setPaymentSession] = useState<Session | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [approved, mySessions, myThreads, myFiles] = await Promise.all([
          getApprovedExperts(),
          getMySessions(),
          getMyChatThreads(),
          getMyVaultFiles(),
        ]);
        setExperts(approved);
        setSessions(mySessions);
        setThreads(myThreads);
        setFiles(myFiles);

        // Preselect for booking: the expert picked on Platter, else the one you last booked.
        const platterSelected = localStorage.getItem("platter_selected_expert");
        let target = approved[0] ?? null;
        if (platterSelected) {
          target = approved.find((e) => e.id === platterSelected) ?? target;
          localStorage.removeItem("platter_selected_expert");
        } else if (mySessions.length > 0) {
          target = approved.find((e) => e.id === mySessions[0].expertId) ?? target;
        }
        setCurrentExpert(target);
      } catch (err) {
        console.error("Error loading client dashboard data", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    }
    loadDashboardData();
  }, []);

  /* ── Derived numbers ───────────────────────────── */
  const live = sessions.filter((s) => s.status !== "cancelled");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const nextSession = upcoming[0];
  const unpaidSessions = live.filter((s) => s.paymentStatus === "unpaid" && (s.amountInr ?? 0) > 0);
  const dueTotal = unpaidSessions.reduce((n, s) => n + (s.amountInr ?? 0), 0);
  const latestThread = threads.find((t) => t.lastMessage);
  const sessionsDelta = monthDelta(live.map((s) => ({ at: s.startsAt, value: 1 })));

  // One progress card per expert you work with.
  const engagements = (() => {
    const byExpert = new Map<string, Session[]>();
    for (const s of live) byExpert.set(s.expertId, [...(byExpert.get(s.expertId) ?? []), s]);
    return [...byExpert.entries()].map(([expertId, list]) => {
      const done = list.filter((s) => s.status === "completed").length;
      const billable = list.filter((s) => (s.amountInr ?? 0) > 0);
      const paid = billable.filter((s) => s.paymentStatus !== "unpaid").length;
      return {
        expertId,
        name: list[0].expertName,
        title: experts.find((e) => e.id === expertId)?.professionalTitle || "Your expert",
        done,
        total: list.length,
        paidPct: billable.length ? (paid / billable.length) * 100 : 100,
      };
    });
  })();

  const toDays = (list: Session[]) =>
    new Set(list.map((s) => isoToDayKey(s.startsAt)).filter((k): k is string => !!k));
  const sessionDays = toDays(live);
  const dueDays = toDays(unpaidSessions);

  // Coming up: next sessions first, then the latest messages and files.
  const comingUp: ScheduleItem[] = [
    ...upcoming.slice(0, 3).map((s) => ({
      id: `s-${s.id}`,
      icon: CalendarClock,
      title: s.title,
      detail: `${s.expertName} • ${s.time}`,
      when: relativeDay(s.startsAt) || s.date,
      href: "/dashboard/client/sessions",
      tone: 1 as const,
    })),
    ...[
      ...threads.filter((t) => t.lastMessage).slice(0, 2).map((t) => ({
        at: t.lastMessageAt ?? "",
        item: {
          id: `m-${t.id}`,
          icon: MessageSquare,
          title: t.counterpartName,
          detail: t.lastMessage ?? "",
          when: formatMessageTime(t.lastMessageAt),
          href: "/dashboard/client/chat",
          tone: 2 as const,
        },
      })),
      ...files.slice(0, 2).map((f) => ({
        at: f.createdAt,
        item: {
          id: `f-${f.id}`,
          icon: FileText,
          title: f.name,
          detail: `${f.uploaderName} • ${formatFileSize(f.sizeBytes)}`,
          when: formatMessageTime(f.createdAt),
          href: "/dashboard/client/vault",
          tone: 3 as const,
        },
      })),
    ]
      .sort((x, y) => y.at.localeCompare(x.at))
      .map((x) => x.item),
  ].slice(0, 5);

  const plateCount = upcoming.length + unpaidSessions.length;

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
                status={nextSession.paymentStatus === "unpaid" ? "Pay to unlock" : relativeDay(nextSession.startsAt) || "Booked"}
                people={[nextSession.expertName]}
                actionLabel={nextSession.paymentStatus === "unpaid" ? `Pay for ${nextSession.title}` : `Join the call for ${nextSession.title}`}
                {...(nextSession.paymentStatus === "unpaid"
                  ? { onAction: () => setPaymentSession(nextSession) }
                  : { href: callHref(nextSession) })}
              />
            ) : (
              <TodayCard
                tone={1}
                eyebrow="Nothing scheduled"
                title="Book a session with an expert"
                actionLabel="Book a session"
                onAction={() => setIsBooking(true)}
              />
            )}

            {dueTotal > 0 ? (
              <TodayCard
                tone={4}
                eyebrow="Held until delivered"
                title={`${formatInr(dueTotal)} awaiting payment`}
                status={`${unpaidSessions.length} due`}
                people={unpaidSessions.map((s) => s.expertName)}
                actionLabel="Pay the oldest session due"
                onAction={() => setPaymentSession(unpaidSessions[0])}
              />
            ) : latestThread ? (
              <TodayCard
                tone={4}
                eyebrow={`Message • ${formatMessageTime(latestThread.lastMessageAt)}`}
                title={latestThread.lastMessage ?? ""}
                people={[latestThread.counterpartName]}
                actionLabel={`Open your conversation with ${latestThread.counterpartName}`}
                href="/dashboard/client/chat"
              />
            ) : (
              <TodayCard
                tone={4}
                eyebrow="Vault"
                title="Share your floor plans and photos"
                actionLabel="Open the vault"
                href="/dashboard/client/vault"
              />
            )}
          </div>
        </section>

        <section aria-labelledby="project-heading" className="flex flex-col gap-5">
          <SectionHeading id="project-heading">Your project</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile tone={1} label="Sessions" value={String(live.length)} delta={sessionsDelta} note={`${upcoming.length} upcoming`} href="/dashboard/client/sessions" />
            <StatTile tone={3} label="Due now" value={formatInr(dueTotal)} note={unpaidSessions.length ? `${unpaidSessions.length} awaiting payment` : "Nothing due"} href="/dashboard/client/sessions" />
            <StatTile tone={2} label="Vault files" value={String(files.length)} note="Shared with your experts" href="/dashboard/client/vault" />
          </div>

          {engagements.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {engagements.map((e, i) => (
                <ProgressCard
                  key={e.expertId}
                  tone={toneAt(i + 2)}
                  icon={DraftingCompass}
                  category={e.title}
                  meta={`${e.done} of ${e.total} ${e.total === 1 ? "session" : "sessions"} done`}
                  title={e.name}
                  bars={[
                    { label: "Sessions done", pct: e.total ? (e.done / e.total) * 100 : 0 },
                    { label: "Paid", pct: e.paidPct },
                  ]}
                  href="/dashboard/client/sessions"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Right column ────────────────────────────── */}
      <aside aria-labelledby="schedule-heading" className="flex min-w-0 flex-col gap-5">
        <SectionHeading
          id="schedule-heading"
          action={
            <button
              type="button"
              onClick={() => setIsBooking(true)}
              className="flex items-center gap-2 border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 font-mono-sos text-[9px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:border-[var(--color-primary)]"
            >
              <Video size={12} strokeWidth={1.75} /> Book
            </button>
          }
        >
          Schedule
        </SectionHeading>
        <MiniCalendar sessionDays={sessionDays} dueDays={dueDays} legend={{ session: "Session", due: "Payment due" }} />
        <h3 className="mt-2 font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)]">Coming up</h3>
        <ScheduleList items={comingUp} empty="Nothing yet. Sessions, messages and shared files appear here." />
      </aside>

      <BookingModal
        open={isBooking}
        onClose={() => setIsBooking(false)}
        experts={experts}
        defaultExpert={currentExpert}
        onBooked={(created) => {
          setSessions((prev) => [created, ...prev]);
          setPaymentSession(created);
        }}
      />

      {paymentSession && (
        <PaymentModal
          sessionId={paymentSession.id}
          amountInr={paymentSession.amountInr}
          expertName={paymentSession.expertName}
          expertUpiId={experts.find((e) => e.id === paymentSession.expertId)?.upiId ?? null}
          session={paymentSession}
          onClose={() => setPaymentSession(null)}
          onPaid={() => {
            getMySessions()
              .then(setSessions)
              .catch((err) => console.error("Refresh after payment failed", err));
          }}
        />
      )}
    </div>
  );
}
