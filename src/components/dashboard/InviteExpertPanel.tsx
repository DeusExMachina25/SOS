"use client";

import { useState } from "react";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { inviteExpert } from "@/lib/data/admin";
import { validateInviteInput } from "@/lib/data/invite";

type Result = { name: string; email: string; emailed: boolean; link: string | null };

const inputClass =
  "w-full bg-[var(--bg-base)] border border-[var(--border-strong)] px-4 py-3 font-inter text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--text-faint)]";

/** Copyable link with the caution that goes with it: anyone who has it can sign in as that expert, once. */
export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = () => {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        setFailed(false);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => setFailed(true));
  };
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input readOnly value={link} aria-label="Sign-in link" onFocus={(e) => e.currentTarget.select()} className={`${inputClass} font-mono-sos text-[11px]`} />
        <button type="button" onClick={copy} className="flex shrink-0 items-center gap-2 border border-[var(--color-primary)] px-4 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]">
          {copied ? <Check size={13} className="text-[var(--color-green)]" /> : <Copy size={13} />}
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      {failed && <p className="mt-2 font-inter text-[11px] text-[var(--color-orange)]">Couldn&apos;t copy automatically. Select the link and copy it by hand.</p>}
      <p className="mt-2 font-inter text-[11px] text-[var(--text-muted)]">
        Send this only to them, privately. Anyone who opens it can sign in as this expert, and it works once.
      </p>
    </div>
  );
}

export default function InviteExpertPanel({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; fullName?: string }>({});
  const [busy, setBusy] = useState<"email" | "link" | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const send = async (deliver: "email" | "link") => {
    setError("");
    setResult(null);
    const check = validateInviteInput({ email, fullName });
    if (!check.ok) {
      setFieldErrors(check.errors);
      return;
    }
    setFieldErrors({});
    setBusy(deliver);
    try {
      const r = await inviteExpert({ email: check.email, fullName: check.fullName, deliver });
      setResult({ name: check.fullName, email: check.email, emailed: r.emailed, link: r.link });
      setFullName("");
      setEmail("");
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The invitation couldn't be created.");
    } finally {
      setBusy(null);
    }
  };

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-[var(--color-primary)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-2)]"
        >
          <UserPlus size={14} /> INVITE AN EXPERT
        </button>
        {result && <ResultNote result={result} />}
      </div>
    );
  }

  return (
    <section aria-label="Invite an expert" className="border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-inter text-base font-semibold text-[var(--text-primary)]">Invite an expert</h2>
          <p className="mt-1 font-inter text-xs text-[var(--text-muted)]">They get a link to set a password and complete their profile. You&apos;ll review it before they&apos;re listed.</p>
        </div>
        <button type="button" onClick={() => { setOpen(false); setError(""); setFieldErrors({}); }} className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          CLOSE
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="invite-name" className="mb-2 block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">FULL NAME</label>
          <input id="invite-name" value={fullName} onChange={(e) => { setFullName(e.target.value); setFieldErrors((f) => ({ ...f, fullName: undefined })); }} autoComplete="off" className={inputClass} aria-invalid={!!fieldErrors.fullName} aria-describedby={fieldErrors.fullName ? "invite-name-error" : undefined} />
          {fieldErrors.fullName && <p id="invite-name-error" role="alert" className="mt-2 font-inter text-[11px] text-[var(--color-orange)]">{fieldErrors.fullName}</p>}
        </div>
        <div>
          <label htmlFor="invite-email" className="mb-2 block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">EMAIL</label>
          <input id="invite-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })); }} autoComplete="off" className={inputClass} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "invite-email-error" : undefined} />
          {fieldErrors.email && <p id="invite-email-error" role="alert" className="mt-2 font-inter text-[11px] text-[var(--color-orange)]">{fieldErrors.email}</p>}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 font-inter text-sm text-[var(--color-orange)]">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => send("email")} disabled={busy !== null} className="flex items-center gap-2 border border-[var(--color-primary)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-2)] disabled:opacity-50">
          {busy === "email" && <Loader2 size={13} className="animate-spin" />} SEND INVITATION EMAIL
        </button>
        <button type="button" onClick={() => send("link")} disabled={busy !== null} className="flex items-center gap-2 border border-[var(--border-strong)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50">
          {busy === "link" && <Loader2 size={13} className="animate-spin" />} CREATE LINK INSTEAD
        </button>
      </div>
      <p className="mt-3 font-inter text-[11px] text-[var(--text-faint)]">
        Use &ldquo;create link&rdquo; if email isn&apos;t set up yet or hit its limit: you send the link yourself.
      </p>

      {result && <ResultNote result={result} />}
    </section>
  );
}

function ResultNote({ result }: { result: Result }) {
  return (
    <div role="status" className="mt-4 border border-[var(--color-green)]/40 bg-[var(--color-green)]/10 p-4">
      <p className="font-inter text-sm text-[var(--text-primary)]">
        {result.emailed
          ? <>Invitation sent to <strong>{result.email}</strong>. If it doesn&apos;t arrive, check their spam folder, or use &ldquo;New sign-in link&rdquo; on their card.</>
          : <>{result.name} is invited. Send them this link:</>}
      </p>
      {result.link && <CopyLink link={result.link} />}
    </div>
  );
}
