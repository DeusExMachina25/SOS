import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick} {...rest}>{children}</a>
  ),
}));

const queries = vi.hoisted(() => ({
  getMySessions: vi.fn(),
  getMyPayments: vi.fn(),
  getMyVaultFiles: vi.fn(),
  getMyChatThreads: vi.fn(),
}));
vi.mock("@/lib/data/queries", () => queries);

import DashboardSearch from "@/components/dashboard/DashboardSearch";
import NotificationBell from "@/components/dashboard/NotificationBell";
import type { Session } from "@/lib/data/types";

const session = (over: Partial<Session> & { id: string }): Session => ({
  title: "Facade options",
  clientId: "c",
  expertId: "e",
  clientName: "Asha Rao",
  expertName: "Dr. Sarah Jenkins",
  date: "Nov 3, 2026",
  time: "10:00 AM",
  startsAt: new Date(Date.now() + 3 * 3600_000).toISOString(),
  endsAt: new Date(Date.now() + 4 * 3600_000).toISOString(),
  status: "scheduled",
  durationMinutes: 60,
  duration: "60 min",
  amountInr: 5000,
  paymentStatus: "unpaid",
  ...over,
});

const pages = [
  { name: "Overview", href: "/dashboard/client" },
  { name: "Sessions", href: "/dashboard/client/sessions" },
];

beforeEach(() => {
  push.mockReset();
  Object.values(queries).forEach((fn) => fn.mockReset());
  queries.getMySessions.mockResolvedValue([session({ id: "s1" }), session({ id: "s2", title: "Budget review", status: "completed", paymentStatus: "released" })]);
  queries.getMyPayments.mockResolvedValue([]);
  queries.getMyVaultFiles.mockResolvedValue([
    { id: "f1", sessionId: "s1", uploadedBy: "c", uploaderName: "Asha Rao", name: "site-survey.pdf", storagePath: "x", mimeType: null, sizeBytes: 1, createdAt: "2026-10-01T00:00:00Z" },
  ]);
  queries.getMyChatThreads.mockResolvedValue([]);
});
afterEach(cleanup);

describe("DashboardSearch", () => {
  const box = () => screen.getByRole("combobox", { name: "Search the dashboard" });

  it("suggests pages on focus, before anything is typed", () => {
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Overview", "Sessions"]);
  });

  it("loads the user's data on first focus and finds a file by name", async () => {
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    expect(queries.getMySessions).toHaveBeenCalledTimes(1);
    fireEvent.change(box(), { target: { value: "survey" } });
    await waitFor(() => expect(screen.getByRole("option", { name: /site-survey\.pdf/ })).toBeTruthy());
  });

  it("does not refetch on every focus within 30 seconds", async () => {
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    await waitFor(() => expect(queries.getMyChatThreads).toHaveBeenCalledTimes(1));
    fireEvent.blur(box());
    fireEvent.focus(box());
    expect(queries.getMySessions).toHaveBeenCalledTimes(1);
  });

  it("moves with the arrow keys and opens the highlighted result with Enter", async () => {
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/dashboard/client/sessions");
  });

  it("opens a session result on the sessions page and clears the box", async () => {
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    fireEvent.change(box(), { target: { value: "facade" } });
    const option = await screen.findByRole("option", { name: /Facade options/ });
    fireEvent.click(option);
    expect(push).toHaveBeenCalledWith("/dashboard/client/sessions");
    expect((box() as HTMLInputElement).value).toBe("");
  });

  it("says so when nothing matches", async () => {
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    fireEvent.change(box(), { target: { value: "zzzzqq" } });
    expect(await screen.findByText(/NO MATCHES/)).toBeTruthy();
  });

  it("still searches pages when the data fails to load", async () => {
    queries.getMySessions.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    expect(await screen.findByText(/COULDN.T LOAD SESSIONS/)).toBeTruthy();
    fireEvent.change(box(), { target: { value: "over" } });
    expect(screen.getByRole("option", { name: /Overview/ })).toBeTruthy();
  });

  it("closes on Escape and on an outside click", () => {
    render(<DashboardSearch role="client" pages={pages} />);
    fireEvent.focus(box());
    expect(screen.queryAllByRole("option").length).toBeGreaterThan(0);
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    fireEvent.focus(box());
    fireEvent.mouseDown(document.body);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});

describe("NotificationBell", () => {
  it("shows a count of the things that need action and lists them", async () => {
    render(<NotificationBell role="client" />);
    const bell = await screen.findByRole("button", { name: /1 needs your attention/ });
    fireEvent.click(bell);
    expect(await screen.findByText(/Payment due: Facade options/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Payment due/ }).getAttribute("href")).toBe("/dashboard/client/sessions");
  });

  it("says you're all caught up when there is nothing to do", async () => {
    queries.getMySessions.mockResolvedValue([]);
    render(<NotificationBell role="client" />);
    const bell = await screen.findByRole("button", { name: "Notifications" });
    fireEvent.click(bell);
    expect(await screen.findByText(/all caught up/)).toBeTruthy();
  });

  it("explains a load failure instead of showing a blank panel", async () => {
    queries.getMySessions.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<NotificationBell role="expert" />);
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(await screen.findByText(/COULDN.T LOAD NOTIFICATIONS/)).toBeTruthy();
  });

  it("closes on Escape and follows a link", async () => {
    render(<NotificationBell role="client" />);
    const bell = await screen.findByRole("button", { name: /needs your attention/ });
    fireEvent.click(bell);
    await screen.findByText(/Payment due/);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();

    fireEvent.click(bell);
    fireEvent.click(await screen.findByRole("link", { name: /Payment due/ }));
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
  });
});
