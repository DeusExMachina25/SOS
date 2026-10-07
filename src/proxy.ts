import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Next.js 16 Proxy (formerly middleware). Runs on the Node.js runtime.
 *
 * Responsibilities (optimistic only — the authoritative authorization is
 * Postgres RLS; see supabase/migrations/0010_fix_role_confusion.sql, which
 * closes the underlying data-layer version of the bug this route-level
 * check fixes at the UX layer):
 *   1. Refresh the Supabase session cookie on every matched request.
 *   2. Redirect unauthenticated users away from /dashboard to /login.
 *   3. Redirect a signed-in user away from the OTHER role's dashboard shell
 *      (e.g. a client hitting /dashboard/expert/*) to their own — a client
 *      previously saw expert-shaped UI (and vice versa) simply by typing
 *      the URL, with only RLS (now) stopping them from causing real damage.
 *      Admins are left free to view either.
 */
export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/dashboard");

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const clientSection = pathname.startsWith("/dashboard/client");
  const expertSection = pathname.startsWith("/dashboard/expert");

  if (user && (clientSection || expertSection)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    const mismatched =
      (clientSection && role === "expert") || (expertSection && role === "client");

    if (mismatched) {
      const correctBase = clientSection ? "/dashboard/expert" : "/dashboard/client";
      // Some sections only exist for one role (e.g. expert-only
      // Availability) — swapping the prefix there would 404. Fall back to
      // that role's dashboard root instead of guessing at an equivalent page.
      const subpath = pathname.slice((clientSection ? "/dashboard/client" : "/dashboard/expert").length);
      const sharedSection = ["", "/sessions", "/vault", "/chat"].some(
        (s) => subpath === s
      );
      const correctedPath = sharedSection ? correctBase + subpath : correctBase;
      return NextResponse.redirect(new URL(correctedPath, request.url));
    }
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image files so the session
  // cookie stays fresh across the app, while skipping noise.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
