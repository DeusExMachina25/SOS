import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

export async function register() {
  // Same settings on the Node.js server and the edge runtime (the proxy).
  Sentry.init(sentryOptions);
}

// Reports errors thrown while rendering pages and running route handlers.
export const onRequestError = Sentry.captureRequestError;
