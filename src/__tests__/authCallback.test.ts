import { describe, it, expect } from "vitest";
import { parseAuthCallback, friendlyAuthLinkError } from "@/lib/data/authCallback";

describe("parseAuthCallback", () => {
  it("reads the tokens an invitation brings back in the hash", () => {
    expect(parseAuthCallback("", "#access_token=AAA&refresh_token=RRR&expires_in=3600&token_type=bearer&type=invite")).toEqual({
      kind: "tokens",
      accessToken: "AAA",
      refreshToken: "RRR",
    });
  });

  it("needs both tokens: one alone is not a sign-in", () => {
    expect(parseAuthCallback("", "#access_token=AAA").kind).toBe("none");
    expect(parseAuthCallback("", "#refresh_token=RRR").kind).toBe("none");
  });

  it("reads a token-hash link and only for known types", () => {
    expect(parseAuthCallback("?token_hash=abc&type=invite", "")).toEqual({ kind: "otp", tokenHash: "abc", type: "invite" });
    expect(parseAuthCallback("?token_hash=abc&type=magiclink", "").kind).toBe("otp");
    expect(parseAuthCallback("?token_hash=abc&type=make_me_admin", "").kind).toBe("none");
    expect(parseAuthCallback("?token_hash=abc", "").kind).toBe("none");
  });

  it("reads the code from a browser-sent magic link", () => {
    expect(parseAuthCallback("?code=pkce-123", "")).toEqual({ kind: "code", code: "pkce-123" });
  });

  it("reports an expired link, whether the error is in the hash or the query", () => {
    const inHash = parseAuthCallback("", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    const inQuery = parseAuthCallback("?error=access_denied&error_description=Email+link+is+invalid+or+has+expired", "");
    for (const r of [inHash, inQuery]) {
      expect(r.kind).toBe("error");
      if (r.kind === "error") expect(r.message).toMatch(/expired or has already been used/);
    }
  });

  it("puts an error ahead of any tokens that came with it", () => {
    expect(parseAuthCallback("", "#error=access_denied&access_token=AAA&refresh_token=RRR").kind).toBe("error");
  });

  it("says none for a bare page, an empty string, or the leading characters alone", () => {
    for (const [s, h] of [["", ""], ["?", "#"], ["?foo=bar", "#baz"]] as const) {
      expect(parseAuthCallback(s, h).kind).toBe("none");
    }
  });

  it("copes with the query and hash given with or without their leading symbol", () => {
    expect(parseAuthCallback("code=x", "").kind).toBe("code");
    expect(parseAuthCallback("", "access_token=A&refresh_token=R").kind).toBe("tokens");
  });
});

describe("friendlyAuthLinkError", () => {
  it("never echoes the provider's wording", () => {
    const m = friendlyAuthLinkError("otp_expired", "Email link is invalid or has expired <script>");
    expect(m).not.toMatch(/script|Email link is invalid/);
  });
  it("has a sensible message for a cancelled sign-in and for anything else", () => {
    expect(friendlyAuthLinkError("", "access_denied")).toMatch(/cancelled/);
    expect(friendlyAuthLinkError(null, null)).toMatch(/couldn't sign you in/);
  });
});
