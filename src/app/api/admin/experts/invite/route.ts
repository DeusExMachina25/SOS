import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { sameOrigin, validateInviteInput } from "@/lib/data/invite";

export const dynamic = "force-dynamic";

/**
 * Admin-only expert invitations.
 *
 *   invite  {email, fullName, deliver: "email" | "link"}  create the account and an 'invited' profile row
 *   relink  {expertId}                                    a fresh sign-in link for an invitation not yet completed
 *   revoke  {expertId}                                    cancel an invitation nobody has signed in to
 *
 * This is the one place the service role is needed for people: only the Auth
 * admin API can create a user and send an invitation. So the caller is checked
 * three times, in order: the request must come from this site, from a
 * signed-in session, and from an admin profile.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

function siteOrigin(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || new URL(request.url).origin;
}

type AuthError = { message?: string; status?: number; code?: string } | null;

/** Turns an Auth admin error into something an admin can act on, without leaking internals. */
function describeAuthError(error: AuthError) {
  if (error?.code === "email_exists" || /already (been )?registered|already exists/i.test(error?.message ?? "")) {
    return { status: 409, message: "Someone with that email already has an account. Role changes aren't done through invitations; ask them to use another address, or change the role in the database deliberately." };
  }
  if (error?.status === 429 || /rate limit/i.test(error?.message ?? "")) {
    return { status: 429, message: "Too many emails have been sent recently. Wait a few minutes, or choose \"Create link\" and send it yourself." };
  }
  return { status: 502, message: "The invitation couldn't be created. Try again, or check the Supabase auth logs." };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers.get("origin"), request.url)) {
    return fail(403, "Cross-site request refused");
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail(400, "Invalid request");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Not authenticated");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return fail(403, "Only an admin can do this");

  const admin = createSupabaseAdminClient();
  const redirectTo = `${siteOrigin(request)}/auth/accept`;

  switch (body.action) {
    case "invite":
      return invite(admin, body, user.id, redirectTo);
    case "relink":
    case "revoke":
      return manageInvitation(admin, body, redirectTo);
    default:
      return fail(400, "Unknown action");
  }
}

type Admin = ReturnType<typeof createSupabaseAdminClient>;

async function invite(admin: Admin, body: Record<string, unknown>, adminId: string, redirectTo: string) {
  const check = validateInviteInput({ email: String(body.email ?? ""), fullName: String(body.fullName ?? "") });
  if (!check.ok) {
    return fail(400, Object.values(check.errors)[0] ?? "Check the details and try again.", { fields: check.errors });
  }
  const { email, fullName } = check;

  let userId: string;
  let link: string | null = null;

  if (body.deliver === "link") {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { full_name: fullName }, redirectTo },
    });
    if (error || !data?.user) {
      const d = describeAuthError(error);
      return fail(d.status, d.message);
    }
    userId = data.user.id;
    link = data.properties?.action_link ?? null;
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo });
    if (error || !data?.user) {
      const d = describeAuthError(error);
      return fail(d.status, d.message);
    }
    userId = data.user.id;
  }

  // The account exists now. Finish the job, and if anything fails take the
  // account away again, so a half-made invitation (a user with no expert row)
  // can't be left behind.
  const undo = async (why: string, detail: unknown) => {
    console.error(`Invite for ${email} failed after the account was created (${why})`, detail);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error(`Could not remove the half-created account ${userId}`, error);
    return fail(500, "The invitation couldn't be completed and was cancelled. Nothing was left behind; please try again.");
  };

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, full_name: fullName, role: "expert" }, { onConflict: "id" });
  if (profileError) return undo("profile", profileError);

  const { error: expertError } = await admin.from("expert_profiles").insert({
    profile_id: userId,
    professional_title: "", // placeholders until the expert fills these in; the database refuses to approve it before then
    session_rate_inr: 1,
    status: "invited",
    invited_by: adminId,
  });
  if (expertError) return undo("expert row", expertError);

  return NextResponse.json({ ok: true, expertId: userId, link, emailed: body.deliver !== "link" });
}

async function manageInvitation(admin: Admin, body: Record<string, unknown>, redirectTo: string) {
  const expertId = String(body.expertId ?? "");
  if (!UUID_RE.test(expertId)) return fail(400, "Unknown expert");

  const { data: row } = await admin.from("expert_profiles").select("status").eq("profile_id", expertId).maybeSingle();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", expertId).maybeSingle();
  if (!row || profile?.role !== "expert") return fail(404, "That invitation no longer exists");
  if (row.status !== "invited") {
    return fail(409, "This expert has already submitted a profile. Use the review actions instead.");
  }

  const { data: found, error: lookupError } = await admin.auth.admin.getUserById(expertId);
  const target = found?.user;
  if (lookupError || !target?.email) return fail(404, "That invitation no longer exists");

  if (body.action === "revoke") {
    if (target.last_sign_in_at) {
      return fail(409, "They have already signed in, so this can't be cancelled. Suspend or reject them instead.");
    }
    const { error } = await admin.auth.admin.deleteUser(expertId);
    if (error) return fail(500, "The invitation couldn't be cancelled. Try again.");
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: target.email, options: { redirectTo } });
  const link = data?.properties?.action_link;
  if (error || !link) return fail(502, "A new link couldn't be created. Try again.");
  return NextResponse.json({ ok: true, link });
}
