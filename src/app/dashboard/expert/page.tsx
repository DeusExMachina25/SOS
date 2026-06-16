"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getStoredSessions, getStoredFiles, Session, VaultFile } from "@/utils/sessionsStore";

export default function ExpertDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const expertName = "Dr. Sarah Jenkins";

  useEffect(() => {
    queueMicrotask(() => {
      setSessions(getStoredSessions());
      setFiles(getStoredFiles());
    });
  }, []);

  const mySessions = sessions.filter(s => s.expert === expertName);
  const nextSession = mySessions.find(s => s.status === "scheduled");

  return (
    <div className="w-full h-full relative min-h-screen flex flex-col pb-24">
      {/* 1. HEADER SECTION */}
      <header className="mb-12 mt-4 flex flex-row justify-between items-end gap-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">Overview</h1>
          <p className="font-mono-sos text-sm text-[var(--text-faint)] mt-2 tracking-widest uppercase">Welcome back, {expertName}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button className="relative p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-orange-400 transition-colors group shadow-lg">
            <Bell size={24} className="text-[var(--text-muted)] group-hover:text-orange-400 transition-colors" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-orange-400 rounded-full border-2 border-[var(--bg-surface)] animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* 2. THREE COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 flex-1 w-full">
        
        {/* COLUMN 1: EXPERT STATS & EARNINGS */}
        <div className="flex flex-col gap-8">
          {/* CONSULTING STATS CARD */}
          <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex-1">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-orange-600"></div>
            <div className="flex justify-between items-start mb-8 pl-2">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Performance Metrics</h3>
            </div>
            
            <div className="flex flex-col gap-8 pl-2">
              <div className="w-full">
                <p className="text-sm font-inter text-[var(--text-muted)] font-semibold mb-1">Total Consulting Hours</p>
                <h2 className="font-display text-4xl font-bold text-[var(--text-primary)]">38.5 <span className="text-lg text-[var(--text-faint)]">hrs</span></h2>
                
                <div className="mt-8 mb-2 flex justify-between text-xs font-inter font-bold text-[var(--text-muted)]">
                  <span>Target Hours Reached</span>
                  <span className="text-orange-400">77% Target</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden relative border border-[var(--border)]">
                  <div className="absolute top-0 left-0 h-full w-[77%] bg-gradient-to-r from-orange-500 to-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]"></div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3 mt-auto border-t border-[var(--border)] pt-6">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-[var(--text-muted)]">Monthly Earnings</span>
                  <span className="text-[var(--text-primary)]">₹1,15,500.00</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--text-faint)]">
                  <span>Next payout date</span>
                  <span>June 30, 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: NEXT CLIENT SESSION */}
        <div className="flex flex-col gap-8">
          <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group flex flex-col min-h-[300px] shadow-lg">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
            <h3 className="text-xs font-mono-sos mb-6 text-[var(--text-faint)] tracking-widest uppercase pl-2">Next Consultation</h3>
            
            {nextSession ? (
              <div className="flex flex-col h-full pl-2">
                <h2 className="font-display text-3xl font-bold mb-2 text-[var(--text-primary)]">{nextSession.name}</h2>
                <p className="text-sm text-purple-400 font-mono-sos flex items-center gap-2 mb-2">
                  <Clock size={14} /> {nextSession.date} • {nextSession.time}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-inter mb-6">
                  Client: {nextSession.client}
                </p>
                
                <div className="w-full mt-auto">
                  <Link 
                    href={`/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.name)}&displayName=${encodeURIComponent(expertName)}`}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] py-4 rounded-2xl text-sm font-bold transition-all hover:border-purple-400 group/join"
                  >
                    <Video size={16} className="text-[var(--text-muted)] group-hover/join:text-purple-400 transition-colors" /> Start Video Call
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">No Scheduled Consultations</p>
                <Link href="/dashboard/expert/sessions" className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider">View All Sessions &rarr;</Link>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: SECURE VAULT UPLOADS & CHAT NOTIFICATION */}
        <div className="flex flex-col gap-8">
          {/* VAULT WIDGET */}
          <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex-1">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Client Vault</h3>
              <Link href="/dashboard/expert/vault" className="text-[10px] font-bold text-[var(--text-muted)] hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-1">Open Vault <ArrowRight size={10} /></Link>
            </div>
            
            <p className="text-xs text-[var(--text-muted)] font-inter mb-6 leading-relaxed">
              Retrieve drawing briefs and blueprints uploaded by your clients securely.
            </p>

            <div className="space-y-4">
              {files.slice(0, 2).map((file) => (
                <div key={file.id} className="p-4 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">{file.name}</p>
                    <p className="text-[9px] font-mono-sos text-[var(--text-faint)] uppercase tracking-wider mt-1">{file.size} • {file.date}</p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full uppercase tracking-wider">AES</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
