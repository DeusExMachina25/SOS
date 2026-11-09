import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// Reports errors that happen in the visitor's browser.
Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
