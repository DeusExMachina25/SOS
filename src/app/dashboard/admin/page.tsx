"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserCheck, Wallet, Banknote } from "lucide-react";
import { listExpertsForReview, listPayouts, type AdminExpert, type AdminPayout } from "@/lib/data/admin";
import { getMySessions } from "@/lib/data/queries";
import { payoutReadiness, pendingReviewCount, summarisePayouts, isOwed, sortExperts, TRANSFER_LABEL } from "@/lib/data/adminRules";
import { formatInr } from "@/lib/data/format";
import type { Session } from "@/lib/data/types";
import StatTile from "@/components/dashboard/StatTile";
import Panel from "@/components/dashboard/Panel";

export default function AdminOverviewPage() {
  const [experts, setExperts] = useState<AdminExpert[] | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[] | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Each part loads on its own so one failing query doesn't blank the page.
    const note = (what: string) => (err: unknown) => {
      console.error(`Admin overview: ${what}`, err);
      setErrors((e) => [...e, `Couldn't load ${what}.`]);
    };
    listExpertsForReview().then(setExperts).catch(note("experts"));
    listPayouts().then(setPayouts).catch(note("payouts"));
    getMySessions().then(setSessions).catch(note("sessions"));
  }, []);

  const review = experts ? pendingReviewCount(experts) : null;
  const approved = experts ? experts.filter((e) => e.status === "approved").length : null;
  const summary = payouts ? summarisePayouts(payouts) : null;
  const paidSessions = sessions ? sessions.filter((s) => s.paymentStatus === "escrow_held" || s.paymentStatus === "released") : null;

  const waiting = experts ? sortExperts(experts).filter((e) => e.status === "profile_submitted").slice(0, 5) : [];
  const toSend = payouts ? payouts.filter((p) => isOwed(p) && payoutReadiness(p).ready).slice(0, 5) : [];

  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)]">ADMIN CONSOLE</p>
        {errors.map((e) => (
          <p key={e} role="alert" className="font-mono-sos text-xs text-[var(--color-orange)] mt-2">{e}</p>
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="NEEDS REVIEW" value={review === null ? "—" : String(review)} unit={review === 1 ? "application" : "applications"} icon={ShieldCheck} note={review ? "Experts waiting for approval" : "Nobody waiting"} />
        <StatTile label="LIVE EXPERTS" value={approved === null ? "—" : String(approved)} icon={UserCheck} note="Approved and bookable" />
        <StatTile label="OWED TO EXPERTS" value={summary ? formatInr(summary.owedInr) : "—"} icon={Wallet} note={summary ? `${summary.readyCount} ready to send` : undefined} />
        <StatTile label="PAID SESSIONS" value={paidSessions ? String(paidSessions.length) : "—"} icon={Banknote} note="Across the platform" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Applications to review" subtitle="EXPERTS" href="/dashboard/admin/experts">
          {experts === null ? (
            <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">LOADING…</p>
          ) : waiting.length === 0 ? (
            <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">NOTHING WAITING</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] -my-2">
              {waiting.map((e) => (
                <li key={e.id} className="py-3">
                  <Link href="/dashboard/admin/experts" className="flex items-center justify-between gap-3 hover:text-[var(--color-primary)]">
                    <span className="min-w-0">
                      <span className="block font-inter text-xs font-semibold text-[var(--text-primary)] truncate">{e.fullName}</span>
                      <span className="block font-inter text-[11px] text-[var(--text-muted)] truncate">{e.professionalTitle}</span>
                    </span>
                    <span className="font-mono-sos text-[9px] tracking-[0.2em] text-[var(--color-orange)] shrink-0">REVIEW</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Payouts ready to send" subtitle="MONEY" href="/dashboard/admin/payouts">
          {payouts === null ? (
            <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">LOADING…</p>
          ) : toSend.length === 0 ? (
            <p className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">NOTHING TO SEND</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] -my-2">
              {toSend.map((p) => (
                <li key={p.id} className="py-3">
                  <Link href="/dashboard/admin/payouts" className="flex items-center justify-between gap-3 hover:text-[var(--color-primary)]">
                    <span className="min-w-0">
                      <span className="block font-inter text-xs font-semibold text-[var(--text-primary)] truncate">{p.expertName}</span>
                      <span className="block font-inter text-[11px] text-[var(--text-muted)] truncate">{TRANSFER_LABEL[p.type]} · {p.sessionTitle}</span>
                    </span>
                    <span className="font-display text-base text-[var(--text-primary)] shrink-0">{formatInr(p.amountInr)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
