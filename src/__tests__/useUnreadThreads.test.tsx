import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";

const live = vi.hoisted(() => ({ push: null as null | (() => void), subscribed: 0, unsubscribed: 0 }));
const queries = vi.hoisted(() => ({ getUnreadThreads: vi.fn(), subscribeToMyMessages: vi.fn() }));
vi.mock("@/lib/data/queries", () => queries);

import { useUnreadThreads } from "@/components/dashboard/useUnreadThreads";
import { notifyUnreadChanged } from "@/lib/data/unreadEvents";
import { totalUnread } from "@/lib/data/unread";
import { buildNotices, actionCount } from "@/lib/data/notifications";

const row = (threadId: string, unread: number) => ({ threadId, counterpartId: "x", counterpartName: "Ravi Menon", unread, latestAt: null });

function Probe({ enabled = true, routeKey = "/a" }: { enabled?: boolean; routeKey?: string }) {
  const threads = useUnreadThreads(enabled, routeKey);
  return <p data-testid="total">{totalUnread(threads)}</p>;
}
const total = () => screen.getByTestId("total").textContent;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  queries.getUnreadThreads.mockReset();
  queries.subscribeToMyMessages.mockReset();
  live.push = null;
  live.subscribed = 0;
  live.unsubscribed = 0;
  queries.getUnreadThreads.mockResolvedValue([row("a", 2)]);
  queries.subscribeToMyMessages.mockImplementation((cb: () => void) => {
    live.push = cb;
    live.subscribed += 1;
    return () => { live.unsubscribed += 1; };
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useUnreadThreads", () => {
  it("loads the count on mount", async () => {
    render(<Probe />);
    await waitFor(() => expect(total()).toBe("2"));
  });

  it("recounts when a new message arrives live", async () => {
    render(<Probe />);
    await waitFor(() => expect(total()).toBe("2"));
    queries.getUnreadThreads.mockResolvedValue([row("a", 3)]);
    act(() => live.push?.());
    await waitFor(() => expect(total()).toBe("3"));
  });

  it("recounts when a conversation is read elsewhere on the page", async () => {
    render(<Probe />);
    await waitFor(() => expect(total()).toBe("2"));
    queries.getUnreadThreads.mockResolvedValue([]);
    act(() => notifyUnreadChanged());
    await waitFor(() => expect(total()).toBe("0"));
  });

  it("recounts on every route change and on a timer", async () => {
    const { rerender } = render(<Probe routeKey="/a" />);
    await waitFor(() => expect(total()).toBe("2"));
    queries.getUnreadThreads.mockResolvedValue([row("a", 1)]);
    rerender(<Probe routeKey="/b" />);
    await waitFor(() => expect(total()).toBe("1"));

    queries.getUnreadThreads.mockResolvedValue([row("a", 5)]);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    await waitFor(() => expect(total()).toBe("5"));
  });

  it("does nothing, and shows nothing, when disabled (an admin has no inbox)", async () => {
    render(<Probe enabled={false} />);
    await act(async () => { vi.advanceTimersByTime(120_000); });
    expect(queries.getUnreadThreads).not.toHaveBeenCalled();
    expect(live.subscribed).toBe(0);
    expect(total()).toBe("0");
  });

  it("shows no badge rather than breaking when counting fails", async () => {
    queries.getUnreadThreads.mockRejectedValue(new Error("function my_unread_threads() does not exist"));
    render(<Probe />);
    await waitFor(() => expect(queries.getUnreadThreads).toHaveBeenCalled());
    expect(total()).toBe("0");
  });

  it("keeps the last good count if a later recount fails", async () => {
    render(<Probe />);
    await waitFor(() => expect(total()).toBe("2"));
    queries.getUnreadThreads.mockRejectedValue(new Error("network"));
    act(() => live.push?.());
    await waitFor(() => expect(queries.getUnreadThreads).toHaveBeenCalledTimes(2));
    expect(total()).toBe("2");
  });

  it("stops listening when it unmounts", async () => {
    const { unmount } = render(<Probe />);
    await waitFor(() => expect(total()).toBe("2"));
    unmount();
    expect(live.unsubscribed).toBe(1);
    await act(async () => { vi.advanceTimersByTime(120_000); });
    expect(queries.getUnreadThreads).toHaveBeenCalledTimes(1);
  });
});

describe("buildNotices: unread messages", () => {
  const base = { role: "client" as const, sessions: [], payments: [], now: 0 };

  it("turns each unread conversation into an actionable notice, ahead of everything else", () => {
    const list = buildNotices({ ...base, unread: [row("a", 1), row("b", 4)] });
    expect(list.map((n) => n.title)).toEqual(["New message from Ravi Menon", "4 new messages from Ravi Menon"]);
    expect(list.every((n) => n.tone === "action" && n.href === "/dashboard/client/chat")).toBe(true);
    expect(actionCount(list)).toBe(2);
  });

  it("ignores empty rows and works with no unread list at all", () => {
    expect(buildNotices({ ...base, unread: [row("a", 0)] })).toEqual([]);
    expect(buildNotices(base)).toEqual([]);
  });

  it("uses the expert's chat page for an expert", () => {
    expect(buildNotices({ ...base, role: "expert", unread: [row("a", 1)] })[0].href).toBe("/dashboard/expert/chat");
  });
});
