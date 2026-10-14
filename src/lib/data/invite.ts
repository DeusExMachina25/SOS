/**
 * Pure rules for inviting an expert and for the profile they submit. Shared by
 * the server route (which must not trust the browser) and the forms (which
 * show the same messages immediately), so they cannot drift apart.
 */

import { normalizeDisplayName } from "./format";
import { isValidTimeZone, canonicalTimeZone } from "./slots";
import type { ExpertStatus } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type InviteCheck =
  | { ok: true; email: string; fullName: string }
  | { ok: false; errors: { email?: string; fullName?: string } };

export function validateInviteInput(raw: { email: string; fullName: string }): InviteCheck {
  const errors: { email?: string; fullName?: string } = {};

  const email = raw.email.trim().toLowerCase();
  if (!email) errors.email = "Enter an email address.";
  else if (email.length > 254 || !EMAIL_RE.test(email) || email.includes("..")) errors.email = "That doesn't look like a valid email address.";

  const name = normalizeDisplayName(raw.fullName);
  if (!name.ok) errors.fullName = name.error;

  if (errors.email || errors.fullName || !name.ok) return { ok: false, errors };
  return { ok: true, email, fullName: name.name };
}

export const PASSWORD_MIN = 10;

/** A password the expert will use to sign in later. Returns an error message, or null when fine. */
export function validatePasswordPair(password: string, confirm: string, email?: string | null): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > 72) return "Use 72 characters or fewer.";
  if (/^(.)\1+$/.test(password)) return "Choose something less repetitive.";
  if (email && password.toLowerCase() === email.toLowerCase()) return "Your password can't be your email address.";
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/**
 * Cross-site request check for the admin route: the browser sends an Origin
 * header on cross-origin POSTs, and it must match the site being called.
 * A request with no Origin at all (curl, server-to-server) has no browser
 * cookies to abuse, so it is judged by its session alone.
 */
export function sameOrigin(originHeader: string | null, requestUrl: string): boolean {
  if (!originHeader) return true;
  try {
    return new URL(originHeader).host === new URL(requestUrl).host;
  } catch {
    return false;
  }
}

// ---- the expert's profile -----------------------------------------------------

export interface ExpertProfileForm {
  title: string;
  location: string;
  bio: string;
  years: string;
  rate: string;
  firm: string;
  coa: string;
  credentials: string;
  specialties: string;
  languages: string;
  timezone: string;
  upi: string;
}

export interface ExpertProfileValue {
  professionalTitle: string;
  location: string;
  bio: string;
  yearsExperience: number;
  sessionRateInr: number;
  firm: string | null;
  coaRegistration: string | null;
  credentials: string | null;
  specialties: string[];
  languages: string[];
  timezone: string;
  upiId: string | null;
}

export type ExpertProfileCheck =
  | { ok: true; value: ExpertProfileValue }
  | { ok: false; errors: Partial<Record<keyof ExpertProfileForm, string>> };

export const BIO_MIN = 40;
export const BIO_MAX = 2000;
export const RATE_MIN = 100;
export const RATE_MAX = 200_000;

const UPI_RE = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,63}$/i;

/** "a, b ,A" -> ["a", "b"]: trimmed, de-duplicated ignoring case, capped. */
export function splitList(raw: string, maxItems: number, maxLength: number): { items: string[]; error?: string } {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of raw.split(/[,\n;]/)) {
    const item = part.replace(/\s+/g, " ").trim();
    if (!item || seen.has(item.toLowerCase())) continue;
    if (item.length > maxLength) return { items: [], error: `Keep each entry under ${maxLength} characters.` };
    seen.add(item.toLowerCase());
    items.push(item);
  }
  if (items.length > maxItems) return { items: [], error: `List at most ${maxItems}.` };
  return { items };
}

export function validateExpertProfile(form: ExpertProfileForm): ExpertProfileCheck {
  const errors: Partial<Record<keyof ExpertProfileForm, string>> = {};
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();

  const title = clean(form.title);
  if (title.length < 2) errors.title = "Enter your professional title.";
  else if (title.length > 120) errors.title = "Keep it under 120 characters.";

  const location = clean(form.location);
  if (location.length < 2) errors.location = "Enter the city you work from.";
  else if (location.length > 120) errors.location = "Keep it under 120 characters.";

  const bio = form.bio.trim();
  if (bio.length < BIO_MIN) errors.bio = `Tell clients a little about your work (at least ${BIO_MIN} characters).`;
  else if (bio.length > BIO_MAX) errors.bio = `Keep it under ${BIO_MAX} characters.`;

  // Digits only: Number() would also accept "1e1", "0x10" or " 5 " and quietly change what was typed.
  const yearsText = form.years.trim();
  const years = /^\d{1,3}$/.test(yearsText) ? Number(yearsText) : NaN;
  if (!Number.isInteger(years) || years < 0 || years > 60) errors.years = "Enter whole years of experience, 0 to 60.";

  const rateText = form.rate.trim().replace(/,/g, "");
  const rate = /^\d{1,7}$/.test(rateText) ? Number(rateText) : NaN;
  if (!Number.isInteger(rate) || rate < RATE_MIN || rate > RATE_MAX) {
    errors.rate = `Enter a whole-rupee rate per session between ₹${RATE_MIN.toLocaleString("en-IN")} and ₹${RATE_MAX.toLocaleString("en-IN")}.`;
  }

  const firm = clean(form.firm);
  if (firm.length > 120) errors.firm = "Keep it under 120 characters.";
  const coa = clean(form.coa);
  if (coa.length > 60) errors.coa = "Keep it under 60 characters.";
  const credentials = clean(form.credentials);
  if (credentials.length > 200) errors.credentials = "Keep it under 200 characters.";

  const specialties = splitList(form.specialties, 10, 40);
  if (specialties.error) errors.specialties = specialties.error;
  const languages = splitList(form.languages, 8, 30);
  if (languages.error) errors.languages = languages.error;

  const tz = form.timezone.trim();
  if (!isValidTimeZone(tz)) errors.timezone = "Choose your timezone from the list.";

  const upi = form.upi.trim();
  if (upi && !UPI_RE.test(upi)) errors.upi = "A UPI ID looks like name@bank.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      professionalTitle: title,
      location,
      bio,
      yearsExperience: years,
      sessionRateInr: rate,
      firm: firm || null,
      coaRegistration: coa || null,
      credentials: credentials || null,
      specialties: specialties.items,
      languages: languages.items,
      timezone: canonicalTimeZone(tz),
      upiId: upi || null,
    },
  };
}

// ---- where to send someone after an emailed link ----------------------------------

/** After accepting an invitation or a sign-in link, land on the page that fits who they are. */
export function destinationFor(role: string | null | undefined, expertStatus?: ExpertStatus | null): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "expert") return expertStatus === "invited" || expertStatus == null ? "/dashboard/expert/onboarding" : "/dashboard/expert";
  return "/dashboard/client";
}

/** What an expert is told about their application, for the banner across the top of their dashboard. */
export function applicationNotice(status: ExpertStatus | null | undefined): { text: string; tone: "action" | "info" | "warn"; cta?: { label: string; href: string } } | null {
  switch (status) {
    case "invited":
      return { text: "Welcome. Finish your profile so we can review it and list you.", tone: "action", cta: { label: "Complete profile", href: "/dashboard/expert/onboarding" } };
    case "profile_submitted":
      return { text: "Your profile is with us for review. You'll be listed as soon as it's approved.", tone: "info", cta: { label: "Edit profile", href: "/dashboard/expert/onboarding" } };
    case "rejected":
      return { text: "Your application wasn't approved. Contact us if you'd like to know why.", tone: "warn" };
    case "suspended":
      return { text: "Your listing is paused, so new clients can't book you. Contact us to resolve this.", tone: "warn" };
    default:
      return null;
  }
}
