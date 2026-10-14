/**
 * Pure rules for unread message counts and the conversation list: totals,
 * badge text, how a live incoming message changes the counts, ordering, and
 * filtering. No network, no clock, so every case can be tested.
 */

import type { ChatThreadSummary, Message } from "./types";

/** One conversation with unread messages (the database only returns those). */
export interface UnreadThread {
  threadId: string;
  counterpartId: string;
  counterpartName: string;
  unread: number;
  /** created_at of the newest unread message. */
  latestAt: string | null;
}

export type UnreadMap = Map<string, number>;

export function toUnreadMap(threads: UnreadThread[]): UnreadMap {
  return new Map(threads.filter((t) => t.unread > 0).map((t) => [t.threadId, t.unread]));
}

export function totalUnread(counts: UnreadMap | UnreadThread[]): number {
  const values = counts instanceof Map ? [...counts.values()] : counts.map((t) => t.unread);
  return values.reduce((n, v) => n + Math.max(0, v), 0);
}

/** "" for none, the number up to 9, then "9+": a badge has little room. */
export function badgeText(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return n > 9 ? "9+" : String(Math.floor(n));
}

/** Screen-reader wording that matches the badge. */
export function unreadLabel(n: number): string {
  return n <= 0 ? "" : `${n} unread message${n === 1 ? "" : "s"}`;
}

/**
 * How a message that just arrived changes the counts. Messages you sent never
 * count, and neither do messages in the conversation you are looking at (the
 * caller marks that one read).
 */
export function applyIncomingMessage(
  counts: UnreadMap,
  message: Pick<Message, "threadId" | "senderId">,
  ctx: { me: string | null; activeThreadId: string | null; viewing: boolean }
): UnreadMap {
  if (!ctx.me || message.senderId === ctx.me) return counts;
  if (ctx.viewing && message.threadId === ctx.activeThreadId) return counts;
  const next = new Map(counts);
  next.set(message.threadId, (next.get(message.threadId) ?? 0) + 1);
  return next;
}

/** Most recent activity first; conversations with no messages last, oldest-created last of all. */
export function sortThreadsByActivity<T extends Pick<ChatThreadSummary, "lastMessageAt">>(threads: T[]): T[] {
  return [...threads].sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return 0;
  });
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Filters conversations by the other person's name or the last message; every word must match. */
export function filterThreads<T extends Pick<ChatThreadSummary, "counterpartName" | "lastMessage">>(threads: T[], query: string): T[] {
  const words = norm(query).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return threads;
  return threads.filter((t) => {
    const haystack = norm(`${t.counterpartName} ${t.lastMessage ?? ""}`);
    return words.every((w) => haystack.includes(w));
  });
}

/** Keeps a thread's list preview in step with a message that just arrived. */
export function withLatestMessage(threads: ChatThreadSummary[], message: Message): ChatThreadSummary[] {
  return threads.map((t) =>
    t.id === message.threadId && (!t.lastMessageAt || message.createdAt >= t.lastMessageAt)
      ? { ...t, lastMessage: message.body, lastMessageAt: message.createdAt }
      : t
  );
}
