"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <p className="font-mono-sos text-xs tracking-widest uppercase text-[var(--text-faint)] mb-4">
        Something went wrong
      </p>
      <h1 className="font-display text-4xl font-bold text-[var(--text-primary)] mb-8">
        We hit a snag.
      </h1>
      <button onClick={reset} className="btn-sos-filled px-8 py-3 rounded-2xl text-sm tracking-widest">
        Try again
      </button>
    </div>
  );
}
