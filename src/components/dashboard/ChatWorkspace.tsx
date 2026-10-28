"use client";

import { Search, Star, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getMyChatThreads,
  getMessages,
  sendMessage,
  subscribeToMyMessages,
  getCurrentUserId,
  getUnreadThreads,
  markThreadRead,
} from "@/lib/data/queries";
import { formatMessageTime } from "@/lib/data/format";
import { notifyUnreadChanged } from "@/lib/data/unreadEvents";
import {
  applyIncomingMessage,
  badgeText,
  filterThreads,
  sortThreadsByActivity,
  toUnreadMap,
  unreadLabel,
  withLatestMessage,
  type UnreadMap,
} from "@/lib/data/unread";
import type { ChatThreadSummary, Message } from "@/lib/data/types";

const isVisible = () => typeof document === "undefined" || document.visibilityState === "visible";

export default function ChatWorkspace() {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [unread, setUnread] = useState<UnreadMap>(new Map());
  const [query, setQuery] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  // The live feed outlives renders, so it reads the current values through refs.
  const activeRef = useRef<string | null>(null);
  const userRef = useRef<string | null>(null);
  useEffect(() => {
    activeRef.current = activeThreadId;
    userRef.current = userId;
  }, [activeThreadId, userId]);

  /** Marks a conversation read (up to a message), clears its badge now, and tells the sidebar to recount. */
  const markRead = useCallback((threadId: string, upToMessageId?: string) => {
    setUnread((prev) => {
      if (!prev.has(threadId)) return prev;
      const next = new Map(prev);
      next.delete(threadId);
      return next;
    });
    markThreadRead(threadId, upToMessageId)
      .then(notifyUnreadChanged)
      .catch((err) => console.error("Could not mark the conversation read", err));
  }, []);

  useEffect(() => {
    Promise.all([getMyChatThreads(), getCurrentUserId(), getUnreadThreads().catch(() => [])])
      .then(([myThreads, currentUserId, unreadThreads]) => {
        const ordered = sortThreadsByActivity(myThreads);
        setThreads(ordered);
        setUserId(currentUserId);
        setUnread(toUnreadMap(unreadThreads));
        if (ordered.length > 0) setActiveThreadId(ordered[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load conversations"))
      .finally(() => setLoadingThreads(false));
  }, []);

  // Open conversation: load it, then mark it read up to the last message actually shown.
  useEffect(() => {
    if (!activeThreadId) return;
    let cancelled = false;

    queueMicrotask(() => {
      setLoadingMessages(true);
      getMessages(activeThreadId)
        .then((loaded) => {
          if (cancelled) return;
          setMessages(loaded);
          if (loaded.length > 0 && isVisible()) markRead(activeThreadId, loaded[loaded.length - 1].id);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load messages"))
        .finally(() => setLoadingMessages(false));
    });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, markRead]);

  // One live feed for the whole inbox: new messages in the open conversation
  // appear in it, and every other conversation gets its preview and badge updated.
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToMyMessages((msg) => {
      const open = activeRef.current;
      const me = userRef.current;

      setThreads((prev) => {
        if (prev.some((t) => t.id === msg.threadId)) return sortThreadsByActivity(withLatestMessage(prev, msg));
        // A conversation the other person just started: fetch the list again.
        getMyChatThreads()
          .then((fresh) => setThreads(sortThreadsByActivity(fresh)))
          .catch((err) => console.error("Could not refresh conversations", err));
        return prev;
      });

      if (msg.threadId === open) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.senderId !== me && isVisible()) markRead(msg.threadId, msg.id);
      }
      setUnread((prev) => applyIncomingMessage(prev, msg, { me, activeThreadId: open, viewing: isVisible() }));
    });
    return unsubscribe;
  }, [userId, markRead]);

  // Coming back to a background tab with a conversation open reads it.
  useEffect(() => {
    const onVisible = () => {
      const open = activeRef.current;
      if (isVisible() && open) markRead(open);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const body = messageInput.trim();
    if (!body || !activeThreadId) return;
    setMessageInput("");
    setSending(true);
    try {
      await sendMessage(activeThreadId, body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const visibleThreads = filterThreads(threads, query);

  return (
    <div className="w-full md:h-full md:min-h-[480px] relative flex flex-col md:flex-row gap-6">

      {/* THREAD SIDEBAR */}
      <div className="w-full md:w-[320px] lg:w-[380px] glass-panel border border-[var(--border-strong)] rounded-[32px] flex flex-col overflow-hidden min-h-[300px] md:h-full shrink-0">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search conversations"
              placeholder="Search conversations..."
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--color-orange)] text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingThreads ? (
            <p className="text-xs text-[var(--text-muted)] font-mono-sos p-4">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] font-mono-sos p-4">No conversations yet.</p>
          ) : visibleThreads.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] font-mono-sos p-4">No conversations match &ldquo;{query.trim()}&rdquo;.</p>
          ) : (
            visibleThreads.map(thread => {
              const count = unread.get(thread.id) ?? 0;
              return (
                <div
                  key={thread.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${thread.counterpartName}${count ? `, ${unreadLabel(count)}` : ""}`}
                  onClick={() => setActiveThreadId(thread.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveThreadId(thread.id); } }}
                  className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${
                    activeThreadId === thread.id
                      ? "bg-[var(--bg-surface-2)] border border-[var(--color-orange)]/50 shadow-[0_4px_20px_rgba(255,91,46,0.1)]"
                      : "border border-transparent hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-2)]"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--bg-surface-2)] to-[var(--bg-base)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    <Star size={16} className={activeThreadId === thread.id ? "text-[var(--color-orange)]" : "text-[var(--text-muted)]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <h3 className={`text-sm text-[var(--text-primary)] truncate ${count ? "font-extrabold" : "font-bold"}`}>{thread.counterpartName}</h3>
                      <span className="text-[10px] text-[var(--text-faint)] font-mono-sos shrink-0">{formatMessageTime(thread.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${count ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                        {thread.lastMessage ?? "No messages yet"}
                      </p>
                      {count > 0 && (
                        <span
                          aria-hidden="true"
                          className="shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center bg-[var(--color-orange)] text-[var(--bg-base)] font-mono-sos text-[10px] font-bold tabular-nums rounded-full"
                        >
                          {badgeText(count)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 glass-panel border border-[var(--border-strong)] rounded-[32px] flex flex-col overflow-hidden min-h-[400px] md:h-full">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] font-mono-sos text-xs tracking-widest uppercase">
            {loadingThreads ? "Loading…" : "Select a conversation"}
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-surface-2)]/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                  <Star size={16} className="text-[var(--text-primary)]" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-[var(--text-primary)]">{activeThread.counterpartName}</h2>
                </div>
              </div>
            </div>

            {/* Messages Feed */}
            <div ref={feedRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMine = msg.senderId === userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isMine ? 'items-end self-end' : 'items-start'}`}
                    >
                      <div className={`p-4 rounded-2xl shadow-sm text-sm text-[var(--text-primary)] ${
                        isMine
                          ? 'bg-[var(--color-orange)]/10 border border-[var(--color-orange)]/30 rounded-tr-sm'
                          : 'bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-tl-sm'
                      }`}>
                        {msg.body}
                      </div>
                      <span className={`text-[9px] font-mono-sos text-[var(--text-faint)] mt-2 tracking-widest uppercase ${isMine ? 'mr-1' : 'ml-1'}`}>
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] font-mono-sos text-xs tracking-widest uppercase">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-surface-2)]/30">
              {error && <p className="text-xs text-[var(--color-orange)] font-mono-sos mb-3">{error}</p>}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="Type a message..."
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-full px-6 py-4 text-sm outline-none focus:border-[var(--color-orange)] text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)] shadow-inner"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !messageInput.trim()}
                  className="bg-[var(--text-primary)] text-[var(--bg-base)] px-8 py-4 rounded-full text-sm font-bold hover:bg-[var(--color-orange)] hover:text-[var(--bg-base)] transition-colors shadow-md disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
