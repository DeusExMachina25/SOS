import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const auth = vi.hoisted(() => ({
  setSession: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("@/utils/supabase/client", () => ({ supabase: { auth } }));

const queries = vi.hoisted(() => ({
  getCurrentRole: vi.fn(),
  getMyExpertProfile: vi.fn(),
  getMyAuthInfo: vi.fn(),
  setMyPassword: vi.fn(),
  submitExpertApplication: vi.fn(),
}));
vi.mock("@/lib/data/queries", () => queries);

const admin = vi.hoisted(() => ({
  listExpertsForReview: vi.fn(),
  setExpertStatus: vi.fn(),
  inviteExpert: vi.fn(),
  newInviteLink: vi.fn(),
  cancelInvite: vi.fn(),
}));
vi.mock("@/lib/data/admin", () => admin);

import AcceptPage from "@/app/auth/accept/page";
import ExpertOnboardingPage from "@/app/dashboard/expert/onboarding/page";
import AdminExpertsPage from "@/app/dashboard/admin/experts/page";
import ExpertApplicationBanner from "@/components/dashboard/ExpertApplicationBanner";
import type { Expert } from "@/lib/data/types";
import type { AdminExpert } from "@/lib/data/admin";

const at = (path: string) => window.history.pushState({}, "", path);

beforeEach(() => {
  replace.mockReset();
  Object.values(auth).forEach((f) => f.mockReset());
  Object.values(queries).forEach((f) => f.mockReset());
  Object.values(admin).forEach((f) => f.mockReset());
  auth.setSession.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.getSession.mockResolvedValue({ data: { session: null } });
  queries.getCurrentRole.mockResolvedValue("expert");
  queries.getMyExpertProfile.mockResolvedValue({ status: "invited" });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("confirm", vi.fn(() => true));
  window.confirm = (globalThis as unknown as { confirm: () => boolean }).confirm;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  at("/");
});

describe("Accept page: emailed links", () => {
  it("turns an invitation's tokens into a session and sends a new expert to onboarding", async () => {
    at("/auth/accept#access_token=AAA&refresh_token=RRR&type=invite");
    render(<AcceptPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/expert/onboarding"));
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: "AAA", refresh_token: "RRR" });
    expect(window.location.hash).toBe(""); // the token is gone from the address bar
  });

  it("sends each person to the page that fits them", async () => {
    for (const [role, status, expected] of [
      ["admin", null, "/dashboard/admin"],
      ["client", null, "/dashboard/client"],
      ["expert", "approved", "/dashboard/expert"],
    ] as const) {
      replace.mockReset();
      queries.getCurrentRole.mockResolvedValue(role);
      queries.getMyExpertProfile.mockResolvedValue(status ? { status } : null);
      at("/auth/accept#access_token=A&refresh_token=R");
      const { unmount } = render(<AcceptPage />);
      await waitFor(() => expect(replace, `${role}/${status}`).toHaveBeenCalledWith(expected));
      unmount();
    }
  });

  it("handles token-hash links and browser-sent magic links", async () => {
    at("/auth/accept?token_hash=abc&type=invite");
    const first = render(<AcceptPage />);
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "invite" }));
    first.unmount();

    at("/auth/accept?code=pkce-1");
    render(<AcceptPage />);
    await waitFor(() => expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-1"));
  });

  it("spends a one-time token once, even when React runs the effect twice", async () => {
    at("/auth/accept#access_token=AAA&refresh_token=RRR");
    render(<StrictMode><AcceptPage /></StrictMode>);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(auth.setSession).toHaveBeenCalledTimes(1);
  });

  it("explains an expired link and offers sign-in, without calling the server", async () => {
    at("/auth/accept#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    render(<AcceptPage />);
    expect(await screen.findByText(/expired or has already been used/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "GO TO SIGN IN" }).getAttribute("href")).toBe("/login");
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a friendly error when the server rejects the token", async () => {
    auth.setSession.mockResolvedValue({ error: { message: "Token has expired or is invalid", code: "otp_expired" } });
    at("/auth/accept#access_token=A&refresh_token=R");
    render(<AcceptPage />);
    expect(await screen.findByText(/expired or has already been used/)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not leave someone on a spinner when the page is opened with no link", async () => {
    at("/auth/accept");
    render(<AcceptPage />);
    expect(await screen.findByText(/sign-in links we email/)).toBeTruthy();
  });

  it("lets someone who is already signed in straight through", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: "x" } } });
    queries.getCurrentRole.mockResolvedValue("client");
    at("/auth/accept");
    render(<AcceptPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/client"));
  });

  it("recovers cleanly if reading their role fails", async () => {
    queries.getCurrentRole.mockRejectedValue(new Error("network"));
    at("/auth/accept#access_token=A&refresh_token=R");
    render(<AcceptPage />);
    expect(await screen.findByText(/from this link/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /couldn.t sign you in/i })).toBeTruthy();
  });
});

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp(label, "i")), { target: { value } });

function fillValidProfile() {
  fill("Professional title", "Landscape Architect");
  fill("City you work from", "Goa");
  fill("About your work", "Fifteen years designing coastal gardens and civic spaces across India.");
  fill("Years of experience", "15");
  fill("Rate per session", "3,500");
}

const submitBtn = (name = /SUBMIT FOR REVIEW/) => screen.getByRole("button", { name });

describe("Onboarding: first time", () => {
  beforeEach(() => {
    queries.getMyExpertProfile.mockResolvedValue({ status: "invited", professionalTitle: "", sessionRateInr: 1, specialties: [], languages: [] } as unknown as Expert);
    queries.getMyAuthInfo.mockResolvedValue({ email: "ravi@example.com", passwordSet: false });
    queries.setMyPassword.mockResolvedValue(undefined);
    queries.submitExpertApplication.mockResolvedValue(undefined);
  });

  it("opens blank, asks for a password, and doesn't show the invitation's placeholder values", async () => {
    render(<ExpertOnboardingPage />);
    expect(await screen.findByRole("form", { name: "Expert profile" })).toBeTruthy();
    expect(screen.getByLabelText(/^PASSWORD/)).toBeTruthy();
    expect((screen.getByLabelText(/Rate per session/i) as HTMLInputElement).value).toBe(""); // not "1"
    expect(screen.getByText(/ravi@example\.com/)).toBeTruthy();
  });

  it("reports every problem at once, focuses the first, and saves nothing", async () => {
    render(<ExpertOnboardingPage />);
    await screen.findByRole("form");
    fireEvent.click(submitBtn());
    expect((await screen.findAllByRole("alert")).length).toBeGreaterThanOrEqual(5);
    expect(document.activeElement?.id).toBe("ob-password");
    expect(queries.setMyPassword).not.toHaveBeenCalled();
    expect(queries.submitExpertApplication).not.toHaveBeenCalled();
  });

  it("puts the cursor on the topmost problem: the password first, otherwise the first profile field", async () => {
    render(<ExpertOnboardingPage />);
    await screen.findByRole("form");
    fireEvent.click(submitBtn());
    await waitFor(() => expect(document.activeElement?.id).toBe("ob-password"));

    fireEvent.change(screen.getByLabelText(/^PASSWORD/), { target: { value: "correct horse battery" } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: "correct horse battery" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(document.activeElement?.id).toBe("ob-title"));
  });

  it("puts the cursor on the confirmation box for a mismatch", async () => {
    render(<ExpertOnboardingPage />);
    await screen.findByRole("form");
    fillValidProfile();
    fireEvent.change(screen.getByLabelText(/^PASSWORD/), { target: { value: "correct horse battery" } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: "something else entirely" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(document.activeElement?.id).toBe("ob-confirm"));
  });

  it("stops on a password mismatch before touching the server", async () => {
    render(<ExpertOnboardingPage />);
    await screen.findByRole("form");
    fillValidProfile();
    fireEvent.change(screen.getByLabelText(/^PASSWORD/), { target: { value: "correct horse battery" } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: "correct horse batterX" } });
    fireEvent.click(submitBtn());
    expect(await screen.findByText(/don't match/)).toBeTruthy();
    expect(queries.setMyPassword).not.toHaveBeenCalled();
    expect(queries.submitExpertApplication).not.toHaveBeenCalled();
  });

  it("sets the password, then submits the typed profile, then says thank you", async () => {
    render(<ExpertOnboardingPage />);
    await screen.findByRole("form");
    fillValidProfile();
    fireEvent.change(screen.getByLabelText(/^PASSWORD/), { target: { value: "correct horse battery" } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: "correct horse battery" } });
    fireEvent.click(submitBtn());

    expect(await screen.findByText(/Your profile is with us/)).toBeTruthy();
    expect(queries.setMyPassword).toHaveBeenCalledWith("correct horse battery");
    expect(queries.submitExpertApplication).toHaveBeenCalledWith(
      expect.objectContaining({ professionalTitle: "Landscape Architect", sessionRateInr: 3500, yearsExperience: 15, location: "Goa" })
    );
    expect(queries.setMyPassword.mock.invocationCallOrder[0]).toBeLessThan(queries.submitExpertApplication.mock.invocationCallOrder[0]);
    expect(screen.getByRole("link", { name: /SET YOUR WEEKLY HOURS/ }).getAttribute("href")).toBe("/dashboard/expert/availability");
  });

  it("keeps their answers and doesn't ask for the password twice when saving the profile fails", async () => {
    queries.submitExpertApplication.mockRejectedValueOnce(new Error("Failed to save your profile: network"));
    render(<ExpertOnboardingPage />);
    await screen.findByRole("form");
    fillValidProfile();
    fireEvent.change(screen.getByLabelText(/^PASSWORD/), { target: { value: "correct horse battery" } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: "correct horse battery" } });
    fireEvent.click(submitBtn());

    expect((await screen.findByRole("alert")).textContent).toMatch(/Failed to save your profile/);
    expect((screen.getByLabelText(/Professional title/i) as HTMLInputElement).value).toBe("Landscape Architect");
    expect(screen.queryByLabelText(/^PASSWORD/)).toBeNull(); // already chosen

    fireEvent.click(submitBtn());
    expect(await screen.findByText(/Your profile is with us/)).toBeTruthy();
    expect(queries.setMyPassword).toHaveBeenCalledTimes(1);
    expect(queries.submitExpertApplication).toHaveBeenCalledTimes(2);
  });

  it("shows nothing but a clear error if the profile can't be loaded", async () => {
    queries.getMyExpertProfile.mockRejectedValue(new Error("permission denied"));
    render(<ExpertOnboardingPage />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/permission denied/);
    expect(screen.queryByRole("form")).toBeNull();
  });
});

describe("Onboarding: later visits", () => {
  const submitted = {
    status: "profile_submitted",
    professionalTitle: "Landscape Architect",
    location: "Goa",
    bio: "Fifteen years designing coastal gardens and civic spaces across India.",
    yearsExperience: 15,
    sessionRateInr: 3500,
    firm: null,
    coaRegistration: null,
    credentials: null,
    specialties: ["Landscape"],
    languages: ["English"],
    timezone: "Asia/Kolkata",
    upiId: "ravi@okbank",
  } as unknown as Expert;

  it("opens a submitted profile for editing with everything filled in, and no password to set", async () => {
    queries.getMyExpertProfile.mockResolvedValue(submitted);
    queries.getMyAuthInfo.mockResolvedValue({ email: "r@x.com", passwordSet: true });
    render(<ExpertOnboardingPage />);
    expect((await screen.findByLabelText(/Professional title/i) as HTMLInputElement).value).toBe("Landscape Architect");
    expect((screen.getByLabelText(/Rate per session/i) as HTMLInputElement).value).toBe("3500");
    expect((screen.getByLabelText(/UPI ID for payouts/i) as HTMLInputElement).value).toBe("ravi@okbank");
    expect(screen.queryByLabelText(/^PASSWORD/)).toBeNull();
    expect(submitBtn(/SAVE CHANGES/)).toBeTruthy();
  });

  it("does not offer a form to an approved, rejected or suspended expert", async () => {
    queries.getMyAuthInfo.mockResolvedValue({ email: "r@x.com", passwordSet: true });
    for (const status of ["approved", "rejected", "suspended"]) {
      queries.getMyExpertProfile.mockResolvedValue({ ...submitted, status });
      const { unmount } = render(<ExpertOnboardingPage />);
      await screen.findByRole("link", { name: "BACK TO DASHBOARD" });
      expect(screen.queryByRole("form"), status).toBeNull();
      unmount();
    }
  });

  it("treats an expert account with no profile row as needing to onboard", async () => {
    queries.getMyExpertProfile.mockResolvedValue(null);
    queries.getMyAuthInfo.mockResolvedValue({ email: "r@x.com", passwordSet: true });
    render(<ExpertOnboardingPage />);
    expect(await screen.findByRole("form", { name: "Expert profile" })).toBeTruthy();
  });
});

describe("Application banner", () => {
  it("guides an invited expert to finish, and stays quiet once approved", () => {
    const { rerender } = render(<ExpertApplicationBanner status="invited" />);
    expect(screen.getByRole("link", { name: "COMPLETE PROFILE" }).getAttribute("href")).toBe("/dashboard/expert/onboarding");
    rerender(<ExpertApplicationBanner status="approved" />);
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<ExpertApplicationBanner status={null} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

const adminExpert = (over: Partial<AdminExpert> & { id: string }): AdminExpert => ({
  fullName: "Ravi Menon",
  status: "invited",
  professionalTitle: "",
  location: null,
  firm: null,
  coaRegistration: null,
  credentials: null,
  bio: null,
  yearsExperience: null,
  sessionRateInr: 1,
  upiId: null,
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});

describe("Admin: inviting experts", () => {
  beforeEach(() => {
    admin.listExpertsForReview.mockResolvedValue([]);
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  const openPanel = async () => {
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /INVITE AN EXPERT/ }));
    return screen.getByRole("region", { name: "Invite an expert" });
  };
  const type = (panel: HTMLElement, name: string, email: string) => {
    fireEvent.change(within(panel).getByLabelText("FULL NAME"), { target: { value: name } });
    fireEvent.change(within(panel).getByLabelText("EMAIL"), { target: { value: email } });
  };

  it("rejects a bad email or name before calling the server", async () => {
    const panel = await openPanel();
    type(panel, "R", "nope");
    fireEvent.click(within(panel).getByRole("button", { name: /SEND INVITATION EMAIL/ }));
    expect(await within(panel).findAllByRole("alert")).toHaveLength(2);
    expect(admin.inviteExpert).not.toHaveBeenCalled();
  });

  it("sends the invitation with a tidied email and name, then shows the Invited tab", async () => {
    admin.inviteExpert.mockResolvedValue({ link: null, emailed: true });
    const panel = await openPanel();
    admin.listExpertsForReview.mockResolvedValue([adminExpert({ id: "new" })]);
    type(panel, "  Ravi   Menon ", " Ravi@Example.com ");
    fireEvent.click(within(panel).getByRole("button", { name: /SEND INVITATION EMAIL/ }));

    expect(await screen.findByText(/Invitation sent to/)).toBeTruthy();
    expect(admin.inviteExpert).toHaveBeenCalledWith({ email: "ravi@example.com", fullName: "Ravi Menon", deliver: "email" });
    expect(await screen.findByText(/haven't submitted a profile yet/)).toBeTruthy();
    expect((within(panel).getByLabelText("EMAIL") as HTMLInputElement).value).toBe(""); // ready for the next one
  });

  it("can create a link instead, and copies it with a warning about who may see it", async () => {
    admin.inviteExpert.mockResolvedValue({ link: "https://supabase.test/verify?token=abc", emailed: false });
    const panel = await openPanel();
    type(panel, "Ravi Menon", "ravi@example.com");
    fireEvent.click(within(panel).getByRole("button", { name: /CREATE LINK INSTEAD/ }));

    const link = (await screen.findByLabelText("Sign-in link")) as HTMLInputElement;
    expect(link.value).toBe("https://supabase.test/verify?token=abc");
    expect(admin.inviteExpert).toHaveBeenCalledWith(expect.objectContaining({ deliver: "link" }));
    expect(screen.getByText(/Anyone who opens it can sign in as this expert/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /COPY/ }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://supabase.test/verify?token=abc"));
  });

  it("shows the server's reason when an invitation is refused, and keeps what was typed", async () => {
    admin.inviteExpert.mockRejectedValue(new Error("Someone with that email already has an account."));
    const panel = await openPanel();
    type(panel, "Ravi Menon", "ravi@example.com");
    fireEvent.click(within(panel).getByRole("button", { name: /SEND INVITATION EMAIL/ }));
    expect((await within(panel).findByRole("alert")).textContent).toMatch(/already has an account/);
    expect((within(panel).getByLabelText("EMAIL") as HTMLInputElement).value).toBe("ravi@example.com");
  });

  it("offers a new sign-in link and cancellation on an open invitation, but not on anyone else", async () => {
    admin.listExpertsForReview.mockResolvedValue([adminExpert({ id: "a" }), adminExpert({ id: "b", fullName: "Live Expert", status: "approved", professionalTitle: "Architect" })]);
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /^INVITED/ }));
    expect(await screen.findByRole("button", { name: /NEW SIGN-IN LINK/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /CANCEL INVITATION/ })).toBeTruthy();
    expect(screen.queryByText("Live Expert")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "APPROVED" }));
    expect(screen.queryByRole("button", { name: /CANCEL INVITATION/ })).toBeNull();
  });

  it("makes a new link for an open invitation", async () => {
    admin.listExpertsForReview.mockResolvedValue([adminExpert({ id: "a" })]);
    admin.newInviteLink.mockResolvedValue("https://supabase.test/verify?token=new");
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /^INVITED/ }));
    fireEvent.click(await screen.findByRole("button", { name: /NEW SIGN-IN LINK/ }));
    expect(((await screen.findByLabelText("Sign-in link")) as HTMLInputElement).value).toBe("https://supabase.test/verify?token=new");
    expect(admin.newInviteLink).toHaveBeenCalledWith("a");
  });

  it("cancels an invitation after confirmation and removes the card; declining does nothing", async () => {
    admin.listExpertsForReview.mockResolvedValue([adminExpert({ id: "a" })]);
    admin.cancelInvite.mockResolvedValue(undefined);
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /^INVITED/ }));

    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    fireEvent.click(await screen.findByRole("button", { name: /CANCEL INVITATION/ }));
    expect(admin.cancelInvite).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /CANCEL INVITATION/ }));
    await waitFor(() => expect(admin.cancelInvite).toHaveBeenCalledWith("a"));
    await waitFor(() => expect(screen.queryByText("Ravi Menon")).toBeNull());
  });

  it("keeps the card and shows why when cancelling is refused (they already signed in)", async () => {
    admin.listExpertsForReview.mockResolvedValue([adminExpert({ id: "a" })]);
    admin.cancelInvite.mockRejectedValue(new Error("They have already signed in, so this can't be cancelled."));
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /^INVITED/ }));
    fireEvent.click(await screen.findByRole("button", { name: /CANCEL INVITATION/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/already signed in/);
    expect(screen.getByText("Ravi Menon")).toBeTruthy();
  });

  it("explains an empty Invited tab", async () => {
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /^INVITED/ }));
    expect(await screen.findByText(/No open invitations/)).toBeTruthy();
  });
});
