import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

const admin = vi.hoisted(() => ({
  listExpertsForReview: vi.fn(),
  setExpertStatus: vi.fn(),
  listPayouts: vi.fn(),
  markPayoutSent: vi.fn(),
  recordRefund: vi.fn(),
}));
const queries = vi.hoisted(() => ({ getMySessions: vi.fn() }));
vi.mock("@/lib/data/admin", () => admin);
vi.mock("@/lib/data/queries", () => queries);
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import AdminExpertsPage from "@/app/dashboard/admin/experts/page";
import AdminPayoutsPage from "@/app/dashboard/admin/payouts/page";
import AdminSessionsPage from "@/app/dashboard/admin/sessions/page";
import AdminOverviewPage from "@/app/dashboard/admin/page";
import type { AdminExpert, AdminPayout } from "@/lib/data/admin";
import type { Session } from "@/lib/data/types";

const expert = (over: Partial<AdminExpert> & { id: string }): AdminExpert => ({
  fullName: "Ravi Menon",
  status: "profile_submitted",
  professionalTitle: "Structural Engineer",
  location: "Pune",
  firm: null,
  coaRegistration: "CA/2010/777",
  credentials: "B.Tech",
  bio: "Twenty years of bridges.",
  yearsExperience: 20,
  sessionRateInr: 4000,
  upiId: "ravi@upi",
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});

const payout = (over: Partial<AdminPayout> & { id: string }): AdminPayout => ({
  type: "booking_release",
  status: "pending",
  amountInr: 3000,
  reference: null,
  transferredAt: null,
  createdAt: "2026-10-01T00:00:00Z",
  sessionId: "s1",
  sessionTitle: "Facade options",
  sessionStatus: "scheduled",
  expertId: "e1",
  expertName: "Dr. Sarah Jenkins",
  expertUpiId: "sarah@upi",
  clientName: "Asha Rao",
  ...over,
});

const session = (over: Partial<Session> & { id: string }): Session => ({
  title: "Facade options",
  clientId: "c",
  expertId: "e",
  clientName: "Asha Rao",
  expertName: "Dr. Sarah Jenkins",
  date: "Nov 3, 2026",
  time: "10:00 AM",
  startsAt: null,
  endsAt: null,
  status: "scheduled",
  durationMinutes: 60,
  duration: "60 min",
  amountInr: 5000,
  paymentStatus: "escrow_held",
  ...over,
});

let confirmAnswer = true;
beforeEach(() => {
  Object.values(admin).forEach((f) => f.mockReset());
  queries.getMySessions.mockReset();
  confirmAnswer = true;
  vi.stubGlobal("confirm", vi.fn(() => confirmAnswer));
  window.confirm = (globalThis as unknown as { confirm: () => boolean }).confirm;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Admin / Experts", () => {
  it("opens on the applications waiting for review, with a count", async () => {
    admin.listExpertsForReview.mockResolvedValue([
      expert({ id: "a" }),
      expert({ id: "b", fullName: "Live Expert", status: "approved" }),
    ]);
    render(<AdminExpertsPage />);
    expect(await screen.findByText("Ravi Menon")).toBeTruthy();
    expect(screen.queryByText("Live Expert")).toBeNull();
    expect(screen.getByRole("tab", { name: /NEEDS REVIEW \(1\)/ })).toBeTruthy();
  });

  it("approves after confirmation and moves the expert out of the review list", async () => {
    admin.listExpertsForReview.mockResolvedValue([expert({ id: "a" })]);
    admin.setExpertStatus.mockResolvedValue(undefined);
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "APPROVE" }));
    await waitFor(() => expect(admin.setExpertStatus).toHaveBeenCalledWith("a", "approved"));
    await waitFor(() => expect(screen.queryByText("Ravi Menon")).toBeNull());
    expect(window.confirm).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the admin declines the confirmation", async () => {
    confirmAnswer = false;
    admin.listExpertsForReview.mockResolvedValue([expert({ id: "a" })]);
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "REJECT" }));
    expect(admin.setExpertStatus).not.toHaveBeenCalled();
    expect(screen.getByText("Ravi Menon")).toBeTruthy();
  });

  it("shows the error and leaves the expert where they were when saving fails", async () => {
    admin.listExpertsForReview.mockResolvedValue([expert({ id: "a" })]);
    admin.setExpertStatus.mockRejectedValue(new Error("Only an admin can change expert approval status"));
    render(<AdminExpertsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "APPROVE" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Only an admin/);
    expect(screen.getByText("Ravi Menon")).toBeTruthy();
  });

  it("warns about a missing UPI ID and offers Suspend on the Approved tab", async () => {
    admin.listExpertsForReview.mockResolvedValue([expert({ id: "a", upiId: null }), expert({ id: "b", fullName: "Live Expert", status: "approved" })]);
    render(<AdminExpertsPage />);
    expect((await screen.findByText(/Missing: UPI ID/)).textContent).toMatch(/nowhere to send payouts/);
    fireEvent.click(screen.getByRole("tab", { name: "APPROVED" }));
    expect(screen.getByRole("button", { name: "SUSPEND" })).toBeTruthy();
  });

  it("explains an empty review queue and surfaces a load failure", async () => {
    admin.listExpertsForReview.mockResolvedValue([]);
    const { unmount } = render(<AdminExpertsPage />);
    expect(await screen.findByText(/No applications waiting/)).toBeTruthy();
    unmount();

    admin.listExpertsForReview.mockRejectedValue(new Error("permission denied"));
    render(<AdminExpertsPage />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/permission denied/);
  });
});

describe("Admin / Payouts", () => {
  it("totals what is owed and what can go out now", async () => {
    admin.listPayouts.mockResolvedValue([
      payout({ id: "p1", amountInr: 3000 }),
      payout({ id: "p2", type: "completion_release", amountInr: 2000 }),
      payout({ id: "p3", status: "transferred", amountInr: 1000, reference: "UTR1" }),
    ]);
    render(<AdminPayoutsPage />);
    await screen.findByText("BOOKING PAYOUT (60%)");
    expect(screen.getByText("₹5,000")).toBeTruthy(); // owed: 3,000 + 2,000
    expect(screen.getByText("₹1,000")).toBeTruthy(); // sent
  });

  it("holds the completion share until the session is completed", async () => {
    admin.listPayouts.mockResolvedValue([payout({ id: "p2", type: "completion_release", sessionStatus: "scheduled" })]);
    render(<AdminPayoutsPage />);
    const button = (await screen.findByRole("button", { name: "MARK AS SENT" })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/Wait until the session is marked completed/)).toBeTruthy();
    fireEvent.click(button);
    expect(admin.markPayoutSent).not.toHaveBeenCalled();
  });

  it("records a sent payout with its reference, then reloads from the database", async () => {
    admin.listPayouts
      .mockResolvedValueOnce([payout({ id: "p1" })])
      .mockResolvedValueOnce([payout({ id: "p1", status: "transferred", reference: "UTR-9", transferredAt: "2026-10-02T00:00:00Z" })]);
    admin.markPayoutSent.mockResolvedValue(undefined);
    render(<AdminPayoutsPage />);
    fireEvent.change(await screen.findByLabelText(/Payment reference for Dr. Sarah Jenkins/), { target: { value: "UTR-9" } });
    fireEvent.click(screen.getByRole("button", { name: "MARK AS SENT" }));
    await waitFor(() => expect(admin.markPayoutSent).toHaveBeenCalledWith("p1", "UTR-9"));
    await waitFor(() => expect(admin.listPayouts).toHaveBeenCalledTimes(2));
    // the "To send" tab is now empty, so the row has left it
    await waitFor(() => expect(screen.queryByRole("button", { name: "MARK AS SENT" })).toBeNull());
  });

  it("does not record anything when the admin declines", async () => {
    confirmAnswer = false;
    admin.listPayouts.mockResolvedValue([payout({ id: "p1" })]);
    render(<AdminPayoutsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "MARK AS SENT" }));
    expect(admin.markPayoutSent).not.toHaveBeenCalled();
  });

  it("shows the database's reason when recording fails, and keeps the row", async () => {
    admin.listPayouts.mockResolvedValue([payout({ id: "p1" })]);
    admin.markPayoutSent.mockRejectedValue(new Error("That payout is not waiting to be sent"));
    render(<AdminPayoutsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "MARK AS SENT" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/not waiting to be sent/);
    expect(screen.getByRole("button", { name: "MARK AS SENT" })).toBeTruthy();
  });

  it("flags an expert with no UPI ID instead of showing a blank destination", async () => {
    admin.listPayouts.mockResolvedValue([payout({ id: "p1", expertUpiId: null })]);
    render(<AdminPayoutsPage />);
    expect(await screen.findByText(/No UPI ID on file/)).toBeTruthy();
  });

  it("will not offer to send a payout on a cancelled session", async () => {
    admin.listPayouts.mockResolvedValue([payout({ id: "p1", sessionStatus: "cancelled" })]);
    render(<AdminPayoutsPage />);
    expect(((await screen.findByRole("button", { name: "MARK AS SENT" })) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Check whether this should be refunded/)).toBeTruthy();
  });
});

describe("Admin / Sessions", () => {
  it("offers a refund only for paid sessions", async () => {
    queries.getMySessions.mockResolvedValue([
      session({ id: "paid", title: "Paid one" }),
      session({ id: "unpaid", title: "Unpaid one", paymentStatus: "unpaid" }),
      session({ id: "gone", title: "Refunded one", paymentStatus: "refunded" }),
    ]);
    render(<AdminSessionsPage />);
    await screen.findByText("Paid one");
    expect(screen.getAllByRole("button", { name: "RECORD REFUND" })).toHaveLength(1);
  });

  it("states plainly that a refund does not move money, then records it and reloads", async () => {
    queries.getMySessions.mockResolvedValueOnce([session({ id: "paid" })]).mockResolvedValueOnce([session({ id: "paid", paymentStatus: "refunded", status: "cancelled" })]);
    admin.recordRefund.mockResolvedValue(undefined);
    render(<AdminSessionsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "RECORD REFUND" }));
    expect((window.confirm as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(/does not move money/);
    await waitFor(() => expect(admin.recordRefund).toHaveBeenCalledWith("paid"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "RECORD REFUND" })).toBeNull());
  });

  it("warns that a direct UPI payment is the expert's to return", async () => {
    queries.getMySessions.mockResolvedValue([session({ id: "upi", paymentStatus: "released" })]);
    render(<AdminSessionsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "RECORD REFUND" }));
    expect((window.confirm as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(/expert has to return the money/);
  });

  it("filters and searches", async () => {
    queries.getMySessions.mockResolvedValue([
      session({ id: "a", title: "Facade options" }),
      session({ id: "b", title: "Budget review", paymentStatus: "unpaid" }),
    ]);
    render(<AdminSessionsPage />);
    await screen.findByText("Facade options");
    fireEvent.click(screen.getByRole("tab", { name: "UNPAID" }));
    expect(screen.queryByText("Facade options")).toBeNull();
    expect(screen.getByText("Budget review")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "ALL" }));
    fireEvent.change(screen.getByLabelText("Search sessions"), { target: { value: "budget" } });
    expect(screen.queryByText("Facade options")).toBeNull();
  });
});

describe("Admin / Overview", () => {
  it("summarises the queues and links through", async () => {
    admin.listExpertsForReview.mockResolvedValue([expert({ id: "a" }), expert({ id: "b", status: "approved", fullName: "Live" })]);
    admin.listPayouts.mockResolvedValue([payout({ id: "p1", amountInr: 3000 })]);
    queries.getMySessions.mockResolvedValue([session({ id: "s1" })]);
    render(<AdminOverviewPage />);
    await screen.findByText("Ravi Menon");
    // owed total in the tile, and the same payout in the "ready to send" list
    expect(screen.getAllByText("₹3,000").length).toBeGreaterThanOrEqual(2);
    const links = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(links).toContain("/dashboard/admin/experts");
    expect(links).toContain("/dashboard/admin/payouts");
  });

  it("keeps working when one part fails to load", async () => {
    admin.listExpertsForReview.mockRejectedValue(new Error("boom"));
    admin.listPayouts.mockResolvedValue([]);
    queries.getMySessions.mockResolvedValue([]);
    render(<AdminOverviewPage />);
    expect((await screen.findByText(/Couldn't load experts/))).toBeTruthy();
    const panel = screen.getByText("Payouts ready to send").closest("section")!;
    expect(await within(panel).findByText("NOTHING TO SEND")).toBeTruthy();
  });
});
