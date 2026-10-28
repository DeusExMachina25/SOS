"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { listExpertsForReview, setExpertStatus, newInviteLink, cancelInvite, type AdminExpert } from "@/lib/data/admin";
import InviteExpertPanel, { CopyLink } from "@/components/dashboard/InviteExpertPanel";
import { expertActions, sortExperts, pendingReviewCount, EXPERT_STATUS_LABEL } from "@/lib/data/adminRules";
import { formatInr } from "@/lib/data/format";
import type { ExpertStatus } from "@/lib/data/types";

type Filter = "review" | "invited" | "approved" | "other" | "all";

const STATUS_STYLE: Record<ExpertStatus, string> = {
  invited: "text-[var(--text-muted)] border-[var(--border-strong)]",
  profile_submitted: "text-[var(--color-orange)] border-[var(--color-orange)]/40",
  approved: "text-[var(--color-green)] border-[var(--color-green)]/40",
  rejected: "text-[var(--text-muted)] border-[var(--border-strong)]",
  suspended: "text-[var(--color-orange)] border-[var(--color-orange)]/40",
};

export default function AdminExpertsPage() {
  const [experts, setExperts] = useState<AdminExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("review");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = () =>
    listExpertsForReview()
      .then(setExperts)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load experts"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const relink = async (e: AdminExpert) => {
    setError("");
    setBusy(e.id);
    try {
      const link = await newInviteLink(e.id);
      setLinks((prev) => ({ ...prev, [e.id]: link }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create a new link");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (e: AdminExpert) => {
    if (!window.confirm(`Cancel the invitation for ${e.fullName}?\n\nTheir account is deleted and the link stops working. You can invite them again later.`)) return;
    setError("");
    setBusy(e.id);
    try {
      await cancelInvite(e.id);
      setExperts((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel that invitation");
    } finally {
      setBusy(null);
    }
  };

  const change = async (expert: AdminExpert, to: ExpertStatus, confirmText?: string) => {
    if (confirmText && !window.confirm(`${expert.fullName}\n\n${confirmText}`)) return;
    setError("");
    setBusy(expert.id);
    try {
      await setExpertStatus(expert.id, to);
      setExperts((prev) => prev.map((e) => (e.id === expert.id ? { ...e, status: to } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that expert");
    } finally {
      setBusy(null);
    }
  };

  const reviewCount = pendingReviewCount(experts);
  const invitedCount = experts.filter((e) => e.status === "invited").length;
  const visible = sortExperts(experts).filter((e) =>
    filter === "all"
      ? true
      : filter === "review"
      ? e.status === "profile_submitted"
      : filter === "invited"
      ? e.status === "invited"
      : filter === "approved"
      ? e.status === "approved"
      : !["profile_submitted", "approved", "invited"].includes(e.status)
  );

  const tabs: { id: Filter; label: string }[] = [
    { id: "review", label: `Needs review${reviewCount ? ` (${reviewCount})` : ""}` },
    { id: "invited", label: `Invited${invitedCount ? ` (${invitedCount})` : ""}` },
    { id: "approved", label: "Approved" },
    { id: "other", label: "Other" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Experts</h1>
        <p className="font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)] mt-2">REVIEW APPLICATIONS · CONTROL WHO CAN BE BOOKED</p>
      </div>

      <InviteExpertPanel onInvited={() => { setFilter("invited"); load(); }} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter experts">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={`px-4 py-2 font-mono-sos text-[10px] tracking-[0.2em] border transition-colors ${
              filter === t.id ? "border-[var(--color-primary)] text-[var(--text-primary)] bg-[var(--bg-surface-2)]" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-[var(--color-orange)] font-mono-sos">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">Loading experts…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">
          {filter === "review"
            ? "No applications waiting. New ones appear here once an invited expert submits their profile."
            : filter === "invited"
            ? "No open invitations. Use \"Invite an expert\" above to add one."
            : "Nobody in this view."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visible.map((e) => {
            const actions = expertActions(e.status);
            const expanded = open.has(e.id);
            const missing = [!e.coaRegistration && "COA registration", !e.credentials && "credentials", !e.upiId && "UPI ID"].filter(Boolean) as string[];
            return (
              <li key={e.id} className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-inter text-base font-semibold text-[var(--text-primary)] truncate">{e.fullName}</h2>
                    <p className="font-inter text-xs text-[var(--color-primary)] mt-1">{e.professionalTitle}{e.firm ? ` · ${e.firm}` : ""}</p>
                  </div>
                  <span className={`shrink-0 border px-2 py-1 font-mono-sos text-[9px] tracking-[0.2em] ${STATUS_STYLE[e.status]}`}>
                    {EXPERT_STATUS_LABEL[e.status].toUpperCase()}
                  </span>
                </div>

                {e.status === "invited" && (
                  <div className="font-inter text-xs text-[var(--text-muted)]">
                    <p>Invited {new Date(e.createdAt).toLocaleDateString()}. They haven&apos;t submitted a profile yet, so there is nothing to review.</p>
                    {links[e.id] && <CopyLink link={links[e.id]} />}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => relink(e)} disabled={busy === e.id} className="flex items-center gap-2 border border-[var(--border-strong)] px-4 py-2.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50">
                        {busy === e.id && <Loader2 size={12} className="animate-spin" />} NEW SIGN-IN LINK
                      </button>
                      <button onClick={() => cancel(e)} disabled={busy === e.id} className="border border-[var(--border-strong)] px-4 py-2.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:border-[var(--color-orange)] hover:text-[var(--color-orange)] disabled:opacity-50">
                        CANCEL INVITATION
                      </button>
                    </div>
                  </div>
                )}

                {e.status !== "invited" && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-inter text-xs">
                  {[
                    ["Location", e.location],
                    ["Experience", e.yearsExperience != null ? `${e.yearsExperience} years` : null],
                    ["Rate", formatInr(e.sessionRateInr)],
                    ["COA registration", e.coaRegistration],
                    ["Credentials", e.credentials],
                    ["Payout UPI", e.upiId],
                  ].map(([k, v]) => (
                    <div key={k as string} className="min-w-0">
                      <dt className="font-mono-sos text-[8px] tracking-[0.25em] text-[var(--text-faint)]">{(k as string).toUpperCase()}</dt>
                      <dd className="text-[var(--text-primary)] truncate">{v || <span className="text-[var(--text-faint)]">Not provided</span>}</dd>
                    </div>
                  ))}
                </dl>
                )}

                {e.bio && (
                  <div>
                    <p className={`font-inter text-xs text-[var(--text-muted)] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>{e.bio}</p>
                    {e.bio.length > 180 && (
                      <button
                        onClick={() => setOpen((prev) => { const n = new Set(prev); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })}
                        className="mt-1 font-mono-sos text-[9px] tracking-[0.2em] text-[var(--color-primary)] hover:underline"
                      >
                        {expanded ? "SHOW LESS" : "READ MORE"}
                      </button>
                    )}
                  </div>
                )}

                {e.status === "profile_submitted" && missing.length > 0 && (
                  <p className="font-inter text-[11px] text-[var(--color-orange)]">Missing: {missing.join(", ")}. {!e.upiId ? "Without a UPI ID, clients can't pay them directly and you'll have nowhere to send payouts." : ""}</p>
                )}

                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                    {actions.map((a) => (
                      <button
                        key={a.to}
                        onClick={() => change(e, a.to, a.confirm)}
                        disabled={busy === e.id}
                        className={`flex items-center gap-2 px-4 py-2.5 font-mono-sos text-[10px] tracking-[0.2em] border transition-colors disabled:opacity-50 ${
                          a.tone === "primary"
                            ? "border-[var(--color-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                            : a.tone === "danger"
                            ? "border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]"
                            : "border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {busy === e.id && <Loader2 size={12} className="animate-spin" />}
                        {a.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
