"use client";

import { Search, Phone, Video, Star } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  getMyChatThreads,
  getMessages,
  sendMessage,
  subscribeToMessages,
  getCurrentUserId,
} from "@/lib/data/queries";
import type { ChatThreadSummary, Message } from "@/lib/data/types";
import { formatMessageTime } from "@/lib/data/format";

export default function ClientChatPage() {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [myThreads, uid] = await Promise.all([getMyChatThreads(), getCurrentUserId()]);
        setThreads(myThreads);
        setUserId(uid);
        setActiveThreadId((prev) => prev || myThreads[0]?.id || null);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    // When no thread is selected, the JSX below renders a distinct
    // "select a conversation" state without reading `messages`.
    if (!activeThreadId) return;
    let active = true;
    getMessages(activeThreadId)
      .then((msgs) => active && setMessages(msgs))
      .catch((err) => console.error(err));

    const unsubscribe = subscribeToMessages(activeThreadId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeThreadId]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !activeThreadId) return;
    const body = message;
    setMessage("");
    try {
      await sendMessage(activeThreadId, body);
    } catch (err) {
      console.error(err);
      setMessage(body);
    }
  }, [message, activeThreadId]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  return (
    <div className="w-full h-[calc(100vh-128px)] relative flex flex-col md:flex-row gap-6 pb-6">

      {/* EXPERT SIDEBAR */}
      <div className="w-full md:w-[320px] lg:w-[380px] glass-panel border border-[var(--border-strong)] rounded-[32px] flex flex-col overflow-hidden min-h-[300px] md:h-full shrink-0">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:border-pink-400 text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {threads.length === 0 && (
            <p className="text-xs text-[var(--text-faint)] font-mono-sos text-center py-8 tracking-widest uppercase">
              No conversations yet. Book a session to start chatting with an expert.
            </p>
          )}
          {threads.map(thread => (
            <div
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${
                activeThreadId === thread.id
                  ? "bg-[var(--bg-surface-2)] border border-pink-400/50 shadow-[0_4px_20px_rgba(240,101,149,0.1)]"
                  : "border border-transparent hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-2)]"
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--bg-surface-2)] to-[var(--bg-base)] border border-[var(--border)] flex items-center justify-center">
                  <Star size={16} className={activeThreadId === thread.id ? "text-pink-400" : "text-[var(--text-muted)]"} />
                </div>
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
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 glass-panel border border-[var(--border-strong)] rounded-[32px] flex flex-col overflow-hidden min-h-[400px] md:h-full">
        {/* Chat Header */}
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-surface-2)]/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
              <Star size={16} className="text-[var(--text-primary)]" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[var(--text-primary)]">{activeThread?.counterpartName ?? "Select a conversation"}</h2>
              <p className="text-xs text-[var(--text-muted)] font-mono-sos">Expert</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all">
              <Phone size={16} />
            </button>
            <button className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-purple-400 hover:border-purple-400 transition-all">
              <Video size={16} />
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          {!activeThreadId ? (
            <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] font-mono-sos text-xs tracking-widest uppercase">
              Select a conversation to view messages.
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  msg.senderId === userId ? 'items-end self-end' : 'items-start'
                }`}
              >
                <div className={`p-4 rounded-2xl shadow-sm text-sm text-[var(--text-primary)] ${
                  msg.senderId === userId
                    ? 'bg-pink-400/10 border border-pink-400/30 rounded-tr-sm'
                    : 'bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-tl-sm'
                }`}>
                  {msg.body}
                </div>
                <span className={`text-[9px] font-mono-sos text-[var(--text-faint)] mt-2 tracking-widest uppercase ${
                  msg.senderId === userId ? 'mr-1' : 'ml-1'
                }`}>
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] font-mono-sos text-xs tracking-widest uppercase">
              No messages yet. Start the conversation!
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-surface-2)]/30">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type an encrypted message..."
              disabled={!activeThreadId}
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-full px-6 py-4 text-sm outline-none focus:border-pink-400 text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)] shadow-inner disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!activeThreadId}
              className="bg-[var(--text-primary)] text-[var(--bg-base)] px-8 py-4 rounded-full text-sm font-bold hover:bg-pink-400 hover:text-white transition-colors shadow-md disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
