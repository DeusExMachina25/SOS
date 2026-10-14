/**
 * Works out what an emailed link is asking us to do. Supabase hands the result
 * back in one of three shapes depending on the kind of link:
 *   - invitations and admin-made links: tokens in the URL hash (#access_token=...)
 *   - links built from a token hash:    ?token_hash=...&type=...
 *   - magic links sent from the browser (PKCE): ?code=...
 * or an error ("link expired") in either the hash or the query.
 *
 * Kept separate and pure so the page that acts on it stays small, and so the
 * odd cases (expired, already used, empty, tampered) are testable.
 */

export type AuthCallback =
  | { kind: "tokens"; accessToken: string; refreshToken: string }
  | { kind: "otp"; tokenHash: string; type: "invite" | "magiclink" | "recovery" | "email" | "signup" | "email_change" }
  | { kind: "code"; code: string }
  | { kind: "error"; message: string }
  | { kind: "none" };

const OTP_TYPES = ["invite", "magiclink", "recovery", "email", "signup", "email_change"] as const;

export function parseAuthCallback(search: string, hash: string): AuthCallback {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const get = (key: string) => fragment.get(key) ?? query.get(key);

  if (get("error") || get("error_description") || get("error_code")) {
    return { kind: "error", message: friendlyAuthLinkError(get("error_code"), get("error_description")) };
  }

  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "tokens", accessToken, refreshToken };

  const tokenHash = query.get("token_hash");
  const type = query.get("type");
  if (tokenHash && type && (OTP_TYPES as readonly string[]).includes(type)) {
    return { kind: "otp", tokenHash, type: type as (typeof OTP_TYPES)[number] };
  }

  const code = query.get("code");
  if (code) return { kind: "code", code };

  return { kind: "none" };
}

/** What to tell the person, without echoing the provider's wording. */
export function friendlyAuthLinkError(code: string | null, description: string | null): string {
  const text = `${code ?? ""} ${description ?? ""}`.toLowerCase();
  if (/expired|otp_expired|invalid|already|used/.test(text)) {
    return "This link has expired or has already been used. Ask for a new one, or sign in if you already have a password.";
  }
  if (/access_denied/.test(text)) return "That sign-in was cancelled or isn't allowed.";
  return "We couldn't sign you in from this link. Ask for a new one, or sign in directly.";
}
