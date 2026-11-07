/**
 * Error tracking settings shared by the browser, server and edge setups.
 * Sentry stays switched off until NEXT_PUBLIC_SENTRY_DSN is set, so local
 * development and forks send nothing.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only. No performance tracing or session replay: keeps us inside the
  // free tier and matches the privacy policy.
  tracesSampleRate: 0,
  // Never attach IP addresses, cookies or request bodies.
  sendDefaultPii: false,
};
