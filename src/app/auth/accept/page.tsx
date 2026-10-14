"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { getCurrentRole, getMyExpertProfile } from "@/lib/data/queries";
import { parseAuthCallback, friendlyAuthLinkError } from "@/lib/data/authCallback";
import { destinationFor } from "@/lib/data/invite";

/**
 * Where emailed links land: expert invitations, sign-in links an admin makes,
 * and magic links. It turns whatever the link carries into a real session,
 * then sends the person to the page that fits who they are.
 *
 * It has to be a public page: the dashboard's route guard would bounce a
 * visitor with no session yet, losing the link's token on the way.
 */
export default function AcceptPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // A link's token works once. React's development double-run must not spend it twice.
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        if (!supabase) throw new Error("Sign-in isn't available right now.");

        const callback = parseAuthCallback(window.location.search, window.location.hash);
        if (callback.kind === "error") {
          setError(callback.message);
          return;
        }

        let failure: { message?: string; code?: string } | null = null;
        if (callback.kind === "tokens") {
          ({ error: failure } = await supabase.auth.setSession({ access_token: callback.accessToken, refresh_token: callback.refreshToken }));
        } else if (callback.kind === "otp") {
          ({ error: failure } = await supabase.auth.verifyOtp({ token_hash: callback.tokenHash, type: callback.type }));
        } else if (callback.kind === "code") {
          ({ error: failure } = await supabase.auth.exchangeCodeForSession(callback.code));
        } else {
          // Nothing in the URL: fine only if they are already signed in.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setError("This page is for the sign-in links we email. Open the link from your email, or sign in directly.");
            return;
          }
        }

        if (failure) {
          setError(friendlyAuthLinkError(failure.code ?? null, failure.message ?? null));
          return;
        }

        // The link's token has done its job; keep it out of history and referrers.
        window.history.replaceState(null, "", window.location.pathname);

        const role = await getCurrentRole();
        const expert = role === "expert" ? await getMyExpertProfile() : null;
        router.replace(destinationFor(role, expert?.status ?? null));
      } catch (err) {
        console.error("Accepting a sign-in link failed", err);
        setError("We couldn't sign you in from this link. Ask for a new one, or sign in directly.");
      }
    })();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
      <div className="w-full max-w-[440px] border border-[var(--border-strong)] bg-[var(--bg-surface)] p-10 text-center" role="status" aria-live="polite">
        {error ? (
          <>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">We couldn&apos;t sign you in</h1>
            <p className="font-inter text-sm text-[var(--text-muted)] leading-relaxed mb-8">{error}</p>
            <Link
              href="/login"
              className="inline-block border border-[var(--color-primary)] px-6 py-3 font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-2)]"
            >
              GO TO SIGN IN
            </Link>
          </>
        ) : (
          <>
            <Loader2 size={22} className="mx-auto mb-5 animate-spin text-[var(--color-primary)]" />
            <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">Signing you in…</h1>
            <p className="font-inter text-xs text-[var(--text-muted)] mt-2">One moment.</p>
          </>
        )}
      </div>
    </main>
  );
}
