"use client";

import { Search, Star, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  getMyChatThreads,
  getMessages,
  sendMessage,
  subscribeToMessages,
  getCurrentUserId,
} from "@/lib/data/queries";
import { formatMessageTime } from "@/lib/data/format";
import type { ChatThreadSummary, Message } from "@/lib/data/types";

export default function ClientChatPage() {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getMyChatThreads(), getCurrentUserId()])
      .then(([myThreads, currentUserId]) => {
        setThreads(myThreads);
        setUserId(currentUserId);
        if (myThreads.length > 0) setActiveThreadId(myThreads[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load conversations"))
      .finally(() => setLoadingThreads(false));
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;

    queueMicrotask(() => {
      setLoadingMessages(true);
      getMessages(activeThreadId)
        .then(setMessages)
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load messages"))
        .finally(() => setLoadingMessages(false));
    });

    const unsubscribe = subscribeToMessages(activeThreadId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return unsubscribe;
  }, [activeThreadId]);

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

  return (
    <div className="w-full h-[calc(100vh-128px)] relative flex flex-col md:flex-row gap-6 pb-6">

      {/* THREAD SIDEBAR */}
      <div className="w-full md:w-[320px] lg:w-[380px] glass-panel border border-[var(--border-strong)] rounded-[32px] flex flex-col overflow-hidden min-h-[300px] md:h-full shrink-0">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
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
          ) : (
            threads.map(thread => (
              <div
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
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
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{thread.counterpartName}</h3>
                    <span className="text-[10px] text-[var(--text-faint)] font-mono-sos">{formatMessageTime(thread.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs truncate text-[var(--text-muted)]">
                    {thread.lastMessage ?? "No messages yet"}
                  </p>
                </div>
              </div>
            ))
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
