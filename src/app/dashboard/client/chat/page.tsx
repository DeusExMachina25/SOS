"use client";

import { Search, Phone, Video, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { getStoredMessages, saveMessages, ChatMessage } from "@/utils/sessionsStore";

export default function ClientChatPage() {
  const [activeExpert, setActiveExpert] = useState(1);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setMessages(getStoredMessages());
    });
  }, []);

  const handleSend = () => {
    if (!message.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      expertId: activeExpert,
      sender: "client",
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    saveMessages(updated);
    setMessage("");
  };

  const experts = [
    { id: 1, name: "Dr. Sarah Jenkins", role: "Lead Architect", lastMessage: "Will do, thanks!", time: "10:45 AM", unread: 0 },
    { id: 2, name: "Michael Chen", role: "Structural Engineer", lastMessage: "The load-bearing calcs are ready.", time: "Yesterday", unread: 2 },
    { id: 3, name: "Elena Rodriguez", role: "Interior Designer", lastMessage: "Check out the new moodboard.", time: "Tuesday", unread: 0 },
  ];

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
          {experts.map(expert => (
            <div 
              key={expert.id}
              onClick={() => setActiveExpert(expert.id)}
              className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${
                activeExpert === expert.id 
                  ? "bg-[var(--bg-surface-2)] border border-pink-400/50 shadow-[0_4px_20px_rgba(240,101,149,0.1)]" 
                  : "border border-transparent hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-2)]"
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--bg-surface-2)] to-[var(--bg-base)] border border-[var(--border)] flex items-center justify-center">
                  <Star size={16} className={activeExpert === expert.id ? "text-pink-400" : "text-[var(--text-muted)]"} />
                </div>
                {expert.unread > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-pink-400 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                    {expert.unread}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{expert.name}</h3>
                  <span className="text-[10px] text-[var(--text-faint)] font-mono-sos">{expert.time}</span>
                </div>
                <p className={`text-xs truncate ${expert.unread > 0 ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-muted)]"}`}>
                  {expert.lastMessage}
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
              <h2 className="font-bold text-lg text-[var(--text-primary)]">{experts.find(e => e.id === activeExpert)?.name}</h2>
              <p className="text-xs text-[var(--text-muted)] font-mono-sos">{experts.find(e => e.id === activeExpert)?.role}</p>
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
          {messages.filter(m => m.expertId === activeExpert).length > 0 ? (
            messages.filter(m => m.expertId === activeExpert).map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[80%] ${
                  msg.sender === 'client' ? 'items-end self-end' : 'items-start'
                }`}
              >
                <div className={`p-4 rounded-2xl shadow-sm text-sm text-[var(--text-primary)] ${
                  msg.sender === 'client' 
                    ? 'bg-pink-400/10 border border-pink-400/30 rounded-tr-sm' 
                    : 'bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
                <span className={`text-[9px] font-mono-sos text-[var(--text-faint)] mt-2 tracking-widest uppercase ${
                  msg.sender === 'client' ? 'mr-1' : 'ml-1'
                }`}>
                  {msg.time}
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
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-full px-6 py-4 text-sm outline-none focus:border-pink-400 text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)] shadow-inner" 
            />
            <button 
              onClick={handleSend}
              className="bg-[var(--text-primary)] text-[var(--bg-base)] px-8 py-4 rounded-full text-sm font-bold hover:bg-pink-400 hover:text-white transition-colors shadow-md"
            >
              Send
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
