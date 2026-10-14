import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";

const queries = vi.hoisted(() => ({
  getMySessions: vi.fn(),
  getMyPayments: vi.fn(),
  getMyPayoutRows: vi.fn(),
  getExpertById: vi.fn(),
  confirmUpiPaymentReceived: vi.fn(),
  updateSessionStatus: vi.fn(),
}));
vi.mock("@/lib/data/queries", () => queries);
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/components/dashboard/PaymentModal", () => ({ default: () => null }));

import ClientSessionsPage from "@/app/dashboard/client/sessions/page";
import ExpertSessionsPage from "@/app/dashboard/expert/sessions/page";
import type { Session } from "@/lib/data/types";

const session = (over: Partial<Session> & { id: string }): Session => ({
  title: "Facade options",
  clientId: "c",
  expertId: "e",
  clientName: "Asha Rao",
  expertName: "Dr. Sarah Jenkins",
  date: "Nov 3, 2026",
  time: "10:00 AM",
  startsAt: "2026-11-03T04:30:00Z",
  endsAt: "2026-11-03T05:30:00Z",
  status: "scheduled",
  durationMinutes: 60,
  duration: "60 min",
  amountInr: 5000,
  paymentStatus: "escrow_held",
  ...over,
});

beforeEach(() => {
  Object.values(queries).forEach((f) => f.mockReset());
  queries.getMyPayments.mockResolvedValue([]);
  queries.getMyPayoutRows.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const card = async (title: string) => (await screen.findByText(title)).closest("div.glass-panel") as HTMLElement;

describe("Client sessions: badges", () => {
  it("says the money is held only while the session is ahead, and plain Paid afterwards", async () => {
    queries.getMySessions.mockResolvedValue([
      session({ id: "up", title: "Upcoming one" }),
      session({ id: "done", title: "Done one", status: "completed" }),
      session({ id: "unpaid", title: "Unpaid one", paymentStatus: "unpaid" }),
    ]);
    render(<ClientSessionsPage />);
    expect(within(await card("Upcoming one")).getByText("PAID · HELD UNTIL YOUR SESSION", { exact: false })).toBeTruthy();
    expect(within(await card("Done one")).getByText("Paid")).toBeTruthy();
    expect(within(await card("Unpaid one")).getByText("Unpaid")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/escrow/i);
  });
});

describe("Expert sessions: badges follow the payouts", () => {
  it("shows pending, partly paid out and paid out", async () => {
    queries.getMySessions.mockResolvedValue([
      session({ id: "a", title: "Nothing sent yet" }),
      session({ id: "b", title: "Half sent" }),
      session({ id: "c", title: "All sent", status: "completed" }),
    ]);
    queries.getMyPayoutRows.mockResolvedValue([
      { sessionId: "a", status: "pending" },
      { sessionId: "a", status: "pending" },
      { sessionId: "b", status: "transferred" },
      { sessionId: "b", status: "pending" },
      { sessionId: "c", status: "transferred" },
      { sessionId: "c", status: "transferred" },
    ]);
    render(<ExpertSessionsPage />);
    await waitFor(async () => expect(within(await card("All sent")).getByText("Paid out")).toBeTruthy());
    expect(within(await card("Nothing sent yet")).getByText("Paid · payout pending")).toBeTruthy();
    expect(within(await card("Half sent")).getByText("Partly paid out")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/escrow/i);
  });

  it("flags a completed session whose payout is still due", async () => {
    queries.getMySessions.mockResolvedValue([session({ id: "a", title: "Finished", status: "completed" })]);
    queries.getMyPayoutRows.mockResolvedValue([{ sessionId: "a", status: "pending" }]);
    render(<ExpertSessionsPage />);
    expect(within(await card("Finished")).getByText("Paid · payout due")).toBeTruthy();
  });

  it("still shows sessions, with a sensible badge, if the payout rows can't be loaded", async () => {
    queries.getMySessions.mockResolvedValue([session({ id: "a", title: "Facade options" })]);
    queries.getMyPayoutRows.mockRejectedValue(new Error("boom"));
    render(<ExpertSessionsPage />);
    expect(within(await card("Facade options")).getByText("Paid · payout pending")).toBeTruthy();
  });

  it("shows a UPI payment as paid directly", async () => {
    queries.getMySessions.mockResolvedValue([session({ id: "a", title: "UPI one", paymentStatus: "released" })]);
    render(<ExpertSessionsPage />);
    expect(within(await card("UPI one")).getByText("Paid directly")).toBeTruthy();
  });
});
