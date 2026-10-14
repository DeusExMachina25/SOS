"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { listPayouts, markPayoutSent, type AdminPayout } from "@/lib/data/admin";
import { isOwed, payoutReadiness, summarisePayouts, TRANSFER_LABEL } from "@/lib/data/adminRules";
import { formatInr } from "@/lib/data/format";

type Filter = "owed" | "sent" | "all";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("owed");
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () =>
    listPayouts()
      .then(setPayouts)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load payouts"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const send = async (p: AdminPayout) => {
    if (!window.confirm(`Record that you sent ${formatInr(p.amountInr)} to ${p.expertName}?\n\nDo this only after the money has actually left your account. It can't be undone here.`)) return;
    setError("");
    setBusy(p.id);
    try {
      await markPayoutSent(p.id, refs[p.id] ?? "");
      await load(); // re-read: the database is the source of truth for what was recorded
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record that payout");
    } finally {
      setBusy(null);
    }
  };

  const copy = (id: string, text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(id);
        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
      })
      .catch(() => setError("Couldn't copy automatically. Select the UPI ID and copy it manually."));
  };

  const summary = summarisePayouts(payouts);
  const visible = payouts.filter((p) => (filter === "all" ? true : filter === "owed" ? isOwed(p) : p.status === "transferred"));

  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Payouts</h1>
        <p className="font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)] mt-2">MONEY YOU HOLD FOR EXPERTS · SEND IT, THEN RECORD IT HERE</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ["OWED TO EXPERTS", formatInr(summary.owedInr), `${summary.owedCount} payout${summary.owedCount === 1 ? "" : "s"}`],
          ["READY TO SEND", String(summary.readyCount), "booking share paid, or session completed"],
          ["SENT SO FAR", formatInr(summary.sentInr), "recorded as sent"],
          ["HELD", String(summary.owedCount - summary.readyCount), "waiting on completion"],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <p className="font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)] mb-4">{label}</p>
            <p className="font-display text-3xl text-[var(--text-primary)]">{value}</p>
            <p className="font-inter text-[11px] text-[var(--text-muted)] mt-2">{note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter payouts">
        {([["owed", "To send"], ["sent", "Sent"], ["all", "All"]] as [Filter, string][]).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`px-4 py-2 font-mono-sos text-[10px] tracking-[0.2em] border transition-colors ${
              filter === id ? "border-[var(--color-primary)] text-[var(--text-primary)] bg-[var(--bg-surface-2)]" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-[var(--color-orange)] font-mono-sos">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">Loading payouts…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">{filter === "owed" ? "Nothing to send. Payouts appear here when a client pays online." : "Nothing in this view."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((p) => {
            const ready = payoutReadiness(p);
            return (
              <li key={p.id} className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1.4fr] gap-5 items-start">
                <div className="min-w-0">
                  <p className="font-mono-sos text-[9px] tracking-[0.2em] text-[var(--text-faint)]">{TRANSFER_LABEL[p.type].toUpperCase()}</p>
                  <p className="font-display text-2xl text-[var(--text-primary)] mt-1">{formatInr(p.amountInr)}</p>
                  <p className="font-inter text-xs text-[var(--text-muted)] mt-2 truncate">{p.sessionTitle}</p>
                  <p className="font-inter text-[11px] text-[var(--text-faint)] truncate">Client {p.clientName} · session {p.sessionStatus}</p>
                </div>

                <div className="min-w-0">
                  <p className="font-mono-sos text-[9px] tracking-[0.2em] text-[var(--text-faint)]">PAY TO</p>
                  <p className="font-inter text-sm font-semibold text-[var(--text-primary)] mt-1 truncate">{p.expertName}</p>
                  {p.expertUpiId ? (
                    <button
                      onClick={() => copy(p.id, p.expertUpiId!)}
                      className="mt-1 flex items-center gap-2 font-mono-sos text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      aria-label={`Copy ${p.expertName}'s UPI ID`}
                    >
                      {p.expertUpiId} {copied === p.id ? <Check size={12} className="text-[var(--color-green)]" /> : <Copy size={12} />}
                    </button>
                  ) : (
                    <p className="mt-1 font-inter text-[11px] text-[var(--color-orange)]">No UPI ID on file. Ask the expert to add one in Preferences.</p>
                  )}
                </div>

                <div>
                  {p.status === "transferred" ? (
                    <p className="font-inter text-xs text-[var(--color-green)]">
                      Sent{p.transferredAt ? ` ${new Date(p.transferredAt).toLocaleDateString()}` : ""}
                      {p.reference ? <span className="block font-mono-sos text-[10px] text-[var(--text-muted)] mt-1">Ref {p.reference}</span> : null}
                    </p>
                  ) : p.status === "cancelled" ? (
                    <p className="font-inter text-xs text-[var(--text-muted)]">Cancelled (the payment was refunded)</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={refs[p.id] ?? ""}
                        onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                        placeholder="Payment reference (optional)"
                        aria-label={`Payment reference for ${p.expertName}`}
                        disabled={!ready.ready}
                        className="bg-[var(--bg-base)] border border-[var(--border-strong)] px-3 py-2 font-inter text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
                      />
                      <button
                        onClick={() => send(p)}
                        disabled={!ready.ready || busy === p.id}
                        title={ready.reason}
                        className="flex items-center justify-center gap-2 border border-[var(--color-primary)] px-4 py-2.5 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-2)] disabled:border-[var(--border)] disabled:text-[var(--text-faint)] disabled:hover:bg-transparent"
                      >
                        {busy === p.id && <Loader2 size={12} className="animate-spin" />}
                        MARK AS SENT
                      </button>
                      {!ready.ready && ready.reason && <p className="font-inter text-[11px] text-[var(--text-muted)]">{ready.reason}</p>}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
