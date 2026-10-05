/**
 * Single source of truth for company details shown on the site and in the
 * legal pages. Override per deployment with env vars (NEXT_PUBLIC_*), so the
 * real registered details never need a code change.
 */
export const SITE = {
  name: "SOS",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@sos.com",
  /** Registered business name, as it should appear in the Terms and Privacy Policy. */
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "SOS",
  /** Registered office address. Leave empty to omit. */
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "",
  /** Last time the legal pages were materially revised. */
  legalUpdated: "5 October 2026",
} as const;
