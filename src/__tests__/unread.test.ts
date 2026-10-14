import { describe, it, expect } from "vitest";
import {
  toUnreadMap,
  totalUnread,
  badgeText,
  unreadLabel,
  applyIncomingMessage,
  sortThreadsByActivity,
  filterThreads,
  withLatestMessage,
  type UnreadThread,
} from "@/lib/data/unread";
import type { ChatThreadSummary, Message } from "@/lib/data/types";

const unread = (threadId: string, n: number): UnreadThread => ({ threadId, counterpartId: "x", counterpartName: "X", unread: n, latestAt: null });
const thread = (id: string, over: Partial<ChatThreadSummary> = {}): ChatThreadSummary => ({
  id,
  counterpartId: "c",
  counterpartName: "Dr. Sarah Jenkins",
  lastMessage: "See you Thursday",
  lastMessageAt: "2026-10-10T10:00:00Z",
  ...over,
});
const message = (over: Partial<Message> = {}): Message => ({ id: "m", threadId: "t1", senderId: "them", body: "hello", createdAt: "2026-10-11T10:00:00Z", ...over });

describe("totals and badges", () => {
  it("adds up unread across conversations, from a list or a map", () => {
    const list = [unread("a", 2), unread("b", 3)];
    expect(totalUnread(list)).toBe(5);
    expect(totalUnread(toUnreadMap(list))).toBe(5);
    expect(totalUnread([])).toBe(0);
  });

  it("ignores zero and negative counts so a bad row cannot lower the total", () => {
    expect(totalUnread([unread("a", 2), unread("b", -4), unread("c", 0)])).toBe(2);
    expect(toUnreadMap([unread("a", 0), unread("b", 1)]).has("a")).toBe(false);
  });

  it("shows nothing for none, the number up to 9, then 9+", () => {
    expect([0, -1, NaN, Infinity].map(badgeText)).toEqual(["", "", "", ""]);
    expect([1, 5, 9, 10, 250].map(badgeText)).toEqual(["1", "5", "9", "9+", "9+"]);
  });

  it("words the count for a screen reader", () => {
    expect(unreadLabel(0)).toBe("");
    expect(unreadLabel(1)).toBe("1 unread message");
    expect(unreadLabel(3)).toBe("3 unread messages");
  });
});

describe("applyIncomingMessage", () => {
  const start = toUnreadMap([unread("t1", 1)]);
  const ctx = { me: "me", activeThreadId: "t2", viewing: true };

  it("counts a message from the other person in a conversation you are not looking at", () => {
    const next = applyIncomingMessage(start, message({ threadId: "t1" }), ctx);
    expect(next.get("t1")).toBe(2);
    expect(start.get("t1")).toBe(1); // the previous map is not mutated
  });

  it("starts a count for a conversation that had none", () => {
    expect(applyIncomingMessage(new Map(), message({ threadId: "t9" }), ctx).get("t9")).toBe(1);
  });

  it("never counts your own messages", () => {
    expect(applyIncomingMessage(start, message({ senderId: "me" }), ctx)).toBe(start);
  });

  it("does not count a message in the conversation you are reading", () => {
    expect(applyIncomingMessage(start, message({ threadId: "t2" }), ctx)).toBe(start);
  });

  it("does count it if the tab is in the background", () => {
    const next = applyIncomingMessage(start, message({ threadId: "t2" }), { ...ctx, viewing: false });
    expect(next.get("t2")).toBe(1);
  });

  it("does nothing when nobody is signed in", () => {
    expect(applyIncomingMessage(start, message(), { ...ctx, me: null })).toBe(start);
  });
});

describe("sortThreadsByActivity", () => {
  it("puts the most recently active first and empty conversations last", () => {
    const list = [
      thread("empty", { lastMessageAt: null, lastMessage: null }),
      thread("old", { lastMessageAt: "2026-09-01T00:00:00Z" }),
      thread("new", { lastMessageAt: "2026-10-12T00:00:00Z" }),
    ];
    expect(sortThreadsByActivity(list).map((t) => t.id)).toEqual(["new", "old", "empty"]);
  });

  it("does not mutate its input", () => {
    const list = [thread("a", { lastMessageAt: "2026-01-01T00:00:00Z" }), thread("b", { lastMessageAt: "2026-02-01T00:00:00Z" })];
    sortThreadsByActivity(list);
    expect(list.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("filterThreads", () => {
  const list = [
    thread("a", { counterpartName: "Dr. Sarah Jenkins", lastMessage: "I'll mark up the south elevation" }),
    thread("b", { counterpartName: "José Müller", lastMessage: null }),
  ];

  it("returns everything for an empty or blank query", () => {
    expect(filterThreads(list, "")).toBe(list);
    expect(filterThreads(list, "   ")).toBe(list);
  });

  it("matches the name or the last message, ignoring case and accents", () => {
    expect(filterThreads(list, "SARAH").map((t) => t.id)).toEqual(["a"]);
    expect(filterThreads(list, "elevation").map((t) => t.id)).toEqual(["a"]);
    expect(filterThreads(list, "jose muller").map((t) => t.id)).toEqual(["b"]);
  });

  it("needs every word to match and copes with a missing last message", () => {
    expect(filterThreads(list, "sarah elevation")).toHaveLength(1);
    expect(filterThreads(list, "sarah zzz")).toEqual([]);
    expect(() => filterThreads(list, "x")).not.toThrow();
  });
});

describe("withLatestMessage", () => {
  it("updates the preview of the matching conversation only", () => {
    const list = [thread("t1"), thread("t2")];
    const next = withLatestMessage(list, message({ threadId: "t1", body: "newer", createdAt: "2026-10-12T00:00:00Z" }));
    expect(next[0]).toMatchObject({ lastMessage: "newer", lastMessageAt: "2026-10-12T00:00:00Z" });
    expect(next[1]).toBe(list[1]);
  });

  it("ignores a message older than the preview already shown", () => {
    const list = [thread("t1", { lastMessageAt: "2026-10-12T00:00:00Z", lastMessage: "latest" })];
    expect(withLatestMessage(list, message({ createdAt: "2026-10-01T00:00:00Z" }))[0].lastMessage).toBe("latest");
  });

  it("fills a conversation that had no messages yet", () => {
    const list = [thread("t1", { lastMessageAt: null, lastMessage: null })];
    expect(withLatestMessage(list, message())[0].lastMessage).toBe("hello");
  });
});
