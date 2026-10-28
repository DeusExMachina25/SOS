"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { getMyAuthInfo, getMyExpertProfile, setMyPassword, submitExpertApplication } from "@/lib/data/queries";
import {
  BIO_MAX,
  BIO_MIN,
  RATE_MAX,
  RATE_MIN,
  applicationNotice,
  validateExpertProfile,
  validatePasswordPair,
  type ExpertProfileForm,
} from "@/lib/data/invite";
import { COMMON_TIME_ZONES, describeTimeZone, isValidTimeZone, viewerTimeZone } from "@/lib/data/slots";
import type { Expert } from "@/lib/data/types";

type Errors = Partial<Record<keyof ExpertProfileForm, string>>;

const EMPTY: ExpertProfileForm = {
  title: "",
  location: "",
  bio: "",
  years: "",
  rate: "",
  firm: "",
  coa: "",
  credentials: "",
  specialties: "",
  languages: "English",
  timezone: "Asia/Kolkata",
  upi: "",
};

/** The form as it should open: blank for a new invitation, the saved profile when editing a submitted one. */
function initialForm(profile: Expert | null): ExpertProfileForm {
  const guess = viewerTimeZone();
  const base = { ...EMPTY, timezone: guess && isValidTimeZone(guess) ? guess : EMPTY.timezone };
  if (!profile || profile.status === "invited") return base; // an invitation only holds placeholders
  return {
    title: profile.professionalTitle,
    location: profile.location ?? "",
    bio: profile.bio ?? "",
    years: profile.yearsExperience != null ? String(profile.yearsExperience) : "",
    rate: String(profile.sessionRateInr),
    firm: profile.firm ?? "",
    coa: profile.coaRegistration ?? "",
    credentials: profile.credentials ?? "",
    specialties: profile.specialties.join(", "),
    languages: profile.languages.join(", "),
    timezone: profile.timezone && isValidTimeZone(profile.timezone) ? profile.timezone : base.timezone,
    upi: profile.upiId ?? "",
  };
}

const inputClass =
  "w-full bg-[var(--bg-base)] border border-[var(--border-strong)] px-4 py-3 font-inter text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--text-faint)]";

function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-faint)]">
        {label.toUpperCase()}
        {required && <span className="text-[var(--color-orange)]"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 font-inter text-[11px] text-[var(--color-orange)]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 font-inter text-[11px] text-[var(--text-faint)]">{hint}</p>
      ) : null}
    </div>
  );
}

export default function ExpertOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState<Expert | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [form, setForm] = useState<ExpertProfileForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([getMyExpertProfile(), getMyAuthInfo()])
      .then(([p, auth]) => {
        setProfile(p);
        setForm(initialForm(p));
        setEmail(auth?.email ?? null);
        setNeedsPassword(auth ? !auth.passwordSet : false);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "We couldn't load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof ExpertProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const check = validateExpertProfile(form);
    const pwError = needsPassword ? validatePasswordPair(password, confirm, email) : null;
    setErrors(check.ok ? {} : check.errors);
    setPasswordError(pwError ?? "");

    if (!check.ok || pwError) {
      // Put the cursor on the topmost problem so a long form never leaves them hunting.
      // The password section sits above the profile fields, so it comes first.
      const firstField = check.ok ? null : (Object.keys(check.errors)[0] as keyof ExpertProfileForm);
      const target = pwError ? (/match/.test(pwError) ? "ob-confirm" : "ob-password") : `ob-${firstField}`;
      document.getElementById(target)?.focus();
      return;
    }

    setSaving(true);
    try {
      if (needsPassword) {
        await setMyPassword(password);
        setNeedsPassword(false); // chosen: if saving the profile fails below, a retry won't ask again
        setPassword("");
        setConfirm("");
      }
      await submitExpertApplication(check.value);
      setProfile((p) => (p ? { ...p, status: "profile_submitted" } : p));
      setDone(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="font-mono-sos text-sm text-[var(--text-muted)]">Loading…</p>;
  if (loadError) return <p role="alert" className="font-mono-sos text-sm text-[var(--color-orange)]">{loadError}</p>;

  // Only an invited or submitted application can be edited; otherwise it's the admin's call.
  const status = profile?.status ?? "invited";
  const editable = status === "invited" || status === "profile_submitted";

  if (!editable) {
    const notice = applicationNotice(status);
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Your profile</h1>
        <p className="mt-4 font-inter text-sm text-[var(--text-muted)]">
          {status === "approved" ? "Your profile is approved and live." : notice?.text}
        </p>
        <Link href="/dashboard/expert" className="mt-6 inline-block border border-[var(--color-primary)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]">
          BACK TO DASHBOARD
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-2xl" role="status">
        <Check size={28} className="text-[var(--color-green)]" />
        <h1 className="mt-4 font-display text-3xl font-bold text-[var(--text-primary)]">Thank you. Your profile is with us.</h1>
        <p className="mt-4 font-inter text-sm leading-relaxed text-[var(--text-muted)]">
          We review every application by hand. You&apos;ll appear in the directory, and clients will be able to book you, as soon as it&apos;s approved. You can keep improving your profile until then.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/expert/availability" className="border border-[var(--color-primary)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]">
            SET YOUR WEEKLY HOURS
          </Link>
          <Link href="/dashboard/expert" className="border border-[var(--border-strong)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            GO TO DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  const submittedBefore = status === "profile_submitted";

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl flex flex-col gap-8" aria-label="Expert profile">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">{submittedBefore ? "Edit your profile" : "Complete your profile"}</h1>
        <p className="mt-3 font-inter text-sm leading-relaxed text-[var(--text-muted)]">
          {submittedBefore
            ? "Your profile is waiting for review. You can still change anything here."
            : "Tell us about your work. We review each profile before you're listed, so be as specific as you can. Fields marked * are required."}
        </p>
      </div>

      {needsPassword && (
        <fieldset className="border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <legend className="px-2 font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)]">CHOOSE A PASSWORD</legend>
          <p className="mb-5 font-inter text-xs text-[var(--text-muted)]">
            This is how you&apos;ll sign in next time{email ? <> (with <strong className="text-[var(--text-primary)]">{email}</strong>)</> : null}. The link in your invitation works once.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="ob-password" label="Password" required error={passwordError && !/match/.test(passwordError) ? passwordError : undefined}>
              <input id="ob-password" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }} className={inputClass} aria-describedby={passwordError ? "ob-password-error" : undefined} />
            </Field>
            <Field id="ob-confirm" label="Confirm password" required error={passwordError && /match/.test(passwordError) ? passwordError : undefined}>
              <input id="ob-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setPasswordError(""); }} className={inputClass} />
            </Field>
          </div>
        </fieldset>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2 border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <legend className="px-2 font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)]">ABOUT YOU</legend>
        <Field id="ob-title" label="Professional title" required error={errors.title}>
          <input id="ob-title" value={form.title} onChange={set("title")} placeholder="e.g. Landscape Architect" className={inputClass} aria-invalid={!!errors.title} aria-describedby={errors.title ? "ob-title-error" : undefined} />
        </Field>
        <Field id="ob-location" label="City you work from" required error={errors.location}>
          <input id="ob-location" value={form.location} onChange={set("location")} placeholder="e.g. Goa" className={inputClass} aria-invalid={!!errors.location} aria-describedby={errors.location ? "ob-location-error" : undefined} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="ob-bio" label="About your work" required error={errors.bio} hint={`${form.bio.trim().length} / ${BIO_MAX} characters (at least ${BIO_MIN}). Clients read this before booking.`}>
            <textarea id="ob-bio" value={form.bio} onChange={set("bio")} rows={5} className={inputClass} aria-invalid={!!errors.bio} aria-describedby={errors.bio ? "ob-bio-error" : undefined} />
          </Field>
        </div>
        <Field id="ob-years" label="Years of experience" required error={errors.years}>
          <input id="ob-years" inputMode="numeric" value={form.years} onChange={set("years")} className={inputClass} aria-invalid={!!errors.years} aria-describedby={errors.years ? "ob-years-error" : undefined} />
        </Field>
        <Field id="ob-firm" label="Firm" error={errors.firm}>
          <input id="ob-firm" value={form.firm} onChange={set("firm")} placeholder="Optional" className={inputClass} />
        </Field>
        <Field id="ob-coa" label="COA registration" error={errors.coa} hint="If you're a registered architect.">
          <input id="ob-coa" value={form.coa} onChange={set("coa")} placeholder="Optional" className={inputClass} />
        </Field>
        <Field id="ob-credentials" label="Credentials" error={errors.credentials}>
          <input id="ob-credentials" value={form.credentials} onChange={set("credentials")} placeholder="e.g. B.Arch, M.Arch" className={inputClass} />
        </Field>
        <Field id="ob-specialties" label="Specialties" error={errors.specialties} hint="Separate with commas.">
          <input id="ob-specialties" value={form.specialties} onChange={set("specialties")} placeholder="Residential, Sustainable" className={inputClass} />
        </Field>
        <Field id="ob-languages" label="Languages" error={errors.languages} hint="Separate with commas.">
          <input id="ob-languages" value={form.languages} onChange={set("languages")} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2 border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <legend className="px-2 font-mono-sos text-[10px] tracking-[0.25em] text-[var(--text-faint)]">BOOKINGS AND PAYMENT</legend>
        <Field id="ob-rate" label="Rate per session (₹)" required error={errors.rate} hint={`A one-hour session, between ₹${RATE_MIN.toLocaleString("en-IN")} and ₹${RATE_MAX.toLocaleString("en-IN")}.`}>
          <input id="ob-rate" inputMode="numeric" value={form.rate} onChange={set("rate")} className={inputClass} aria-invalid={!!errors.rate} aria-describedby={errors.rate ? "ob-rate-error" : undefined} />
        </Field>
        <Field id="ob-timezone" label="Your timezone" required error={errors.timezone} hint="Your weekly hours and the dates clients pick are read in this timezone.">
          <select id="ob-timezone" value={form.timezone} onChange={set("timezone")} className={inputClass}>
            {[...new Set([form.timezone, ...COMMON_TIME_ZONES])]
              .filter((z) => isValidTimeZone(z))
              .map((zone) => (
                <option key={zone} value={zone}>{describeTimeZone(zone)}</option>
              ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field id="ob-upi" label="UPI ID for payouts" error={errors.upi} hint="Where we send your earnings, and what clients can pay directly. You can add it later in Preferences.">
            <input id="ob-upi" value={form.upi} onChange={set("upi")} placeholder="yourname@bank" className={inputClass} aria-invalid={!!errors.upi} aria-describedby={errors.upi ? "ob-upi-error" : undefined} />
          </Field>
        </div>
      </fieldset>

      {formError && <p role="alert" className="font-inter text-sm text-[var(--color-orange)]">{formError}</p>}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 border border-[var(--color-primary)] bg-[var(--bg-surface-2)] px-8 py-4 font-mono-sos text-[11px] tracking-[0.25em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-base)] disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {submittedBefore ? "SAVE CHANGES" : "SUBMIT FOR REVIEW"}
        </button>
      </div>
    </form>
  );
}
