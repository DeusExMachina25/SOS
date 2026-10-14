import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act, within } from "@testing-library/react";

const live = vi.hoisted(() => ({ push: null as null | ((m: unknown) => void) }));
const queries = vi.hoisted(() => ({
  getMyChatThreads: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  getCurrentUserId: vi.fn(),
  getUnreadThreads: vi.fn(),
  markThreadRead: vi.fn(),
  subscribeToMyMessages: vi.fn(),
  getMySessions: vi.fn(),
  getMyPayments: vi.fn(),
}));
vi.mock("@/lib/data/queries", () => queries);
vi.mock("next/link", () => ({
  default: ({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick} {...rest}>{children}</a>
  ),
}));

import ChatWorkspace from "@/components/dashboard/ChatWorkspace";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { onUnreadChanged } from "@/lib/data/unreadEvents";

const thread = (id: string, name: string, last: string, at: string) => ({
  id,
  counterpartId: `cp-${id}`,
  counterpartName: name,
  lastMessage: last,
  lastMessageAt: at,
});
const msg = (id: string, threadId: string, senderId: string, body: string, createdAt: string) => ({ id, threadId, senderId, body, createdAt });
const unreadRow = (threadId: string, name: string, unread: number) => ({ threadId, counterpartId: "x", counterpartName: name, unread, latestAt: null });

const SARAH = thread("t-sarah", "Dr. Sarah Jenkins", "See you Thursday", "2026-10-12T10:00:00Z");
const RAVI = thread("t-ravi", "Ravi Menon", "Drawings attached", "2026-10-11T10:00:00Z");

let changed = vi.fn();
let off = () => {};
let visibility: "visible" | "hidden" = "visible";

beforeEach(() => {
  Object.values(queries).forEach((f) => f.mockReset());
  live.push = null;
  queries.subscribeToMyMessages.mockImplementation((cb: (m: unknown) => void) => {
    live.push = cb;
    return () => { live.push = null; };
  });
  queries.getCurrentUserId.mockResolvedValue("me");
  queries.getMyChatThreads.mockResolvedValue([SARAH, RAVI]);
  queries.getUnreadThreads.mockResolvedValue([]);
  queries.markThreadRead.mockResolvedValue(undefined);
  queries.getMessages.mockImplementation(async (id: string) =>
    id === "t-sarah"
      ? [msg("m1", id, "them", "hi", "2026-10-12T09:00:00Z"), msg("m2", id, "them", "See you Thursday", "2026-10-12T10:00:00Z")]
      : [msg("r1", id, "them", "Drawings attached", "2026-10-11T10:00:00Z")]
  );
  queries.getMySessions.mockResolvedValue([]);
  queries.getMyPayments.mockResolvedValue([]);
  changed = vi.fn();
  off = onUnreadChanged(changed);
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  // jsdom has no Element.scrollTo (every real browser does); the feed auto-scrolls on new messages.
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  off();
  cleanup();
  vi.restoreAllMocks();
});

const row = (name: RegExp) => screen.getByRole("button", { name });
const send = (m: ReturnType<typeof msg>) => act(async () => { live.push?.(m); });

describe("ChatWorkspace: reading", () => {
  it("opens the most recently active conversation and marks it read up to the last message shown", async () => {
    render(<ChatWorkspace />);
    await waitFor(() => expect(queries.markThreadRead).toHaveBeenCalledWith("t-sarah", "m2"));
    await waitFor(() => expect(changed).toHaveBeenCalled()); // the sidebar badge is told to recount
  });

  it("shows a badge on a conversation with unread messages, and says so to a screen reader", async () => {
    queries.getUnreadThreads.mockResolvedValue([unreadRow("t-ravi", "Ravi Menon", 3)]);
    render(<ChatWorkspace />);
    expect(await screen.findByRole("button", { name: "Ravi Menon, 3 unread messages" })).toBeTruthy();
    expect(row(/Dr\. Sarah Jenkins$/)).toBeTruthy(); // no badge on the others
  });

  it("clears the badge when the conversation is opened, and marks it read", async () => {
    queries.getUnreadThreads.mockResolvedValue([unreadRow("t-ravi", "Ravi Menon", 3)]);
    render(<ChatWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: /Ravi Menon, 3 unread/ }));
    await waitFor(() => expect(queries.markThreadRead).toHaveBeenCalledWith("t-ravi", "r1"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ravi Menon" })).toBeTruthy());
  });

  it("does not mark anything read while the tab is in the background, then reads on return", async () => {
    visibility = "hidden";
    render(<ChatWorkspace />);
    await screen.findByText("See you Thursday", { selector: "div" });
    expect(queries.markThreadRead).not.toHaveBeenCalled();

    visibility = "visible";
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    await waitFor(() => expect(queries.markThreadRead).toHaveBeenCalledWith("t-sarah", undefined));
  });
});

describe("ChatWorkspace: live messages", () => {
  it("shows a new message in the open conversation and reads it, without adding a badge", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    queries.markThreadRead.mockClear();
    await send(msg("m3", "t-sarah", "them", "Running 5 minutes late", "2026-10-12T11:00:00Z"));
    expect(await screen.findByText("Running 5 minutes late", { selector: "div" })).toBeTruthy();
    await waitFor(() => expect(queries.markThreadRead).toHaveBeenCalledWith("t-sarah", "m3"));
    expect(screen.getByRole("button", { name: /^Dr\. Sarah Jenkins$/ })).toBeTruthy();
  });

  it("badges a message in another conversation and moves it to the top with a fresh preview", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    await send(msg("r2", "t-ravi", "them", "Revised drawings", "2026-10-12T12:00:00Z"));
    const ravi = await screen.findByRole("button", { name: "Ravi Menon, 1 unread message" });
    expect(within(ravi).getByText("Revised drawings")).toBeTruthy();
    const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label")).filter(Boolean);
    expect(names[0]).toMatch(/^Ravi Menon/);
    // a second one bumps the count
    await send(msg("r3", "t-ravi", "them", "And one more", "2026-10-12T12:05:00Z"));
    expect(await screen.findByRole("button", { name: "Ravi Menon, 2 unread messages" })).toBeTruthy();
  });

  it("never counts your own message, even in another conversation", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    await send(msg("r9", "t-ravi", "me", "Sent from my phone", "2026-10-12T12:00:00Z"));
    expect(screen.getByRole("button", { name: "Ravi Menon" })).toBeTruthy();
  });

  it("counts a message in the open conversation as unread while the tab is in the background", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    visibility = "hidden";
    queries.markThreadRead.mockClear();
    await send(msg("m3", "t-sarah", "them", "While you were away", "2026-10-12T11:00:00Z"));
    expect(await screen.findByRole("button", { name: "Dr. Sarah Jenkins, 1 unread message" })).toBeTruthy();
    expect(queries.markThreadRead).not.toHaveBeenCalled();
  });

  it("does not duplicate a message that arrives twice", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    const m = msg("m3", "t-sarah", "them", "Once only", "2026-10-12T11:00:00Z");
    await send(m);
    await send(m);
    expect(screen.getAllByText("Once only", { selector: "div" })).toHaveLength(1);
  });

  it("refetches the list when someone starts a brand-new conversation", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    queries.getMyChatThreads.mockResolvedValue([SARAH, RAVI, thread("t-new", "New Person", "Hello!", "2026-10-12T13:00:00Z")]);
    await send(msg("n1", "t-new", "them", "Hello!", "2026-10-12T13:00:00Z"));
    expect(await screen.findByRole("button", { name: /New Person/ })).toBeTruthy();
  });
});

describe("ChatWorkspace: resilience and search", () => {
  it("still works when unread counts can't be loaded (e.g. the database is not updated yet)", async () => {
    queries.getUnreadThreads.mockRejectedValue(new Error("function my_unread_threads() does not exist"));
    render(<ChatWorkspace />);
    expect(await screen.findByRole("button", { name: "Ravi Menon" })).toBeTruthy();
    // messages load a moment after the list; wait for them rather than racing
    expect(await screen.findByText("hi")).toBeTruthy();
  });

  it("keeps the conversation usable when marking read fails", async () => {
    queries.markThreadRead.mockRejectedValue(new Error("network"));
    render(<ChatWorkspace />);
    expect(await screen.findByText("hi")).toBeTruthy();
    expect(changed).not.toHaveBeenCalled();
  });

  it("filters conversations by name or last message and says when nothing matches", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    const box = screen.getByLabelText("Search conversations");
    fireEvent.change(box, { target: { value: "drawings" } });
    expect(screen.queryByRole("button", { name: /Sarah/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Ravi Menon/ })).toBeTruthy();
    fireEvent.change(box, { target: { value: "zzzz" } });
    expect(screen.getByText(/No conversations match/)).toBeTruthy();
  });

  it("opens a conversation from the keyboard", async () => {
    render(<ChatWorkspace />);
    await screen.findByText("hi");
    fireEvent.keyDown(screen.getByRole("button", { name: "Ravi Menon" }), { key: "Enter" });
    expect(await screen.findByText("Drawings attached", { selector: "div" })).toBeTruthy();
  });
});

describe("NotificationBell: unread messages", () => {
  it("counts unread conversations as things needing attention and links to the chat", async () => {
    render(<NotificationBell role="client" unreadThreads={[unreadRow("t-ravi", "Ravi Menon", 2)]} />);
    const bell = await screen.findByRole("button", { name: /1 needs your attention/ });
    fireEvent.click(bell);
    const link = await screen.findByRole("link", { name: /2 new messages from Ravi Menon/ });
    expect(link.getAttribute("href")).toBe("/dashboard/client/chat");
  });

  it("uses the singular for one message, and the expert's own chat page", async () => {
    render(<NotificationBell role="expert" unreadThreads={[unreadRow("t", "Asha Rao", 1)]} />);
    fireEvent.click(await screen.findByRole("button", { name: /needs your attention/ }));
    const link = await screen.findByRole("link", { name: /New message from Asha Rao/ });
    expect(link.getAttribute("href")).toBe("/dashboard/expert/chat");
  });

  it("shows unread messages even if sessions fail to load", async () => {
    queries.getMySessions.mockRejectedValue(new Error("db down"));
    render(<NotificationBell role="client" unreadThreads={[unreadRow("t", "Ravi Menon", 1)]} />);
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(await screen.findByRole("link", { name: /New message from Ravi Menon/ })).toBeTruthy();
  });

  it("is quiet again once there are none", async () => {
    render(<NotificationBell role="client" unreadThreads={[]} />);
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    expect(await screen.findByText(/all caught up/)).toBeTruthy();
  });
});
