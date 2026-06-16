"use client";

import { Calendar as CalIcon, Video, Plus, Search, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getStoredSessions, Session } from "@/utils/sessionsStore";

export default function ClientSessionsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setSessions(getStoredSessions());
    });
  }, []);

  const filteredSessions = sessions.filter(s => activeFilter === "all" || s.status === activeFilter);

  return (
    <div className="w-full relative min-h-screen flex flex-col pt-6 pb-24">
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)] flex items-center gap-4">
            <CalendarDays size={32} className="text-orange-400" /> Sessions Tracker
          </h1>
          <p className="font-mono-sos text-sm text-[var(--text-muted)] mt-3 tracking-widest uppercase">Manage your expert consultations</p>
        </div>
        <div className="flex gap-4 items-start w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search sessions..." 
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
          <button className="btn-sos-filled flex-shrink-0 bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-orange-400 hover:text-orange-400 transition-colors">
            <Plus size={16} className="mr-2 inline" /> Book Session
          </button>
        </div>
      </header>

      {/* FILTERS */}
      <div className="flex gap-4 mb-8">
        {["all", "scheduled", "completed"].map(filter => (
          <button 
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === filter 
                ? "bg-[var(--bg-surface-2)] text-orange-400 border border-orange-400/50 shadow-sm" 
                : "bg-transparent text-[var(--text-muted)] border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* SESSIONS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSessions.map((session) => (
          <div key={session.id} className={`glass-panel p-6 rounded-[32px] border transition-all hover:border-[var(--border-strong)] ${session.status === 'completed' ? 'border-[var(--border)] bg-[var(--bg-surface-2)]/30 opacity-70' : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">{session.name}</h3>
                <p className="text-sm text-[var(--text-muted)] font-inter">{session.expert}</p>
              </div>
              {session.status === 'scheduled' ? (
                <div className="px-3 py-1 bg-orange-400/10 text-orange-400 text-[10px] font-bold rounded-full uppercase tracking-widest border border-orange-400/20">
                  Upcoming
                </div>
              ) : (
                <div className="px-3 py-1 bg-[var(--bg-surface-2)] text-[var(--text-muted)] text-[10px] font-bold rounded-full uppercase tracking-widest border border-[var(--border-strong)]">
                  Completed
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 text-sm font-mono-sos text-[var(--text-faint)] mb-8">
              <div className="flex items-center gap-2"><CalIcon size={14} className={session.status === 'scheduled' ? "text-orange-400" : ""} /> {session.date}</div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">• {session.time}</div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">• {session.duration}</div>
            </div>

            <div className="flex justify-end pt-6 border-t border-[var(--border)]">
              {session.status === 'scheduled' ? (
                <Link 
                  href={`/dashboard/video-call?sessionId=${session.id}&sessionName=${encodeURIComponent(session.name)}&displayName=Client`}
                  className="btn-sos-filled px-6 py-3 text-xs w-full sm:w-auto text-center justify-center bg-orange-400 hover:bg-orange-500 text-white border-transparent shadow-md transition-colors rounded-2xl"
                >
                  <Video size={16} className="mr-2 inline" /> Join Video Call
                </Link>
              ) : (
                <button className="px-6 py-3 text-xs w-full sm:w-auto text-center justify-center font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)]">
                  View Notes
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
