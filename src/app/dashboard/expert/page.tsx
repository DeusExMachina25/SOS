"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, Video } from "lucide-react";
import Link from "next/link";
import { getMyProfile, getMySessions, getMyPayments } from "@/lib/data/queries";
import { formatInr } from "@/lib/data/format";
import type { Session, Payment } from "@/lib/data/types";

function HoursLineChart({ data, days }: { data: number[]; days: string[] }) {
  
  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min || 1;
  
  const width = 320;
  const height = 110;
  const padding = 15;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  
  const points = data.map((val, index) => {
    const x = padding + (index / (data.length - 1)) * plotWidth;
    const y = padding + plotHeight - ((val - min) / range) * plotHeight;
    return `${x},${y}`;
  });
  
  const pathData = `M ${points[0]} L ${points.join(" L ")}`;
  const areaData = `${pathData} L ${points[points.length - 1].split(",")[0]},${height - padding} L ${points[0].split(",")[0]},${height - padding} Z`;

  return (
    <div className="flex flex-col gap-3 mt-6">
      <div className="flex justify-between items-center text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">
        <span>Last 7 Days (hrs)</span>
        <span>Peak: {Math.max(...data).toFixed(1)}h</span>
      </div>
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible w-full">
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-orange)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--color-orange)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding + ratio * plotHeight;
            return (
              <line 
                key={i} 
                x1={padding} 
                y1={y} 
                x2={width - padding} 
                y2={y} 
                stroke="var(--border)" 
                strokeWidth="1" 
                strokeDasharray="2,4" 
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaData} fill="url(#chart-area-grad)" />

          {/* Line Path */}
          <path
            d={pathData}
            fill="none"
            stroke="var(--color-orange)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0px 3px 6px rgba(255, 109, 66, 0.3))" }}
          />

          {/* Nodes */}
          {points.map((pt, i) => {
            const [x, y] = pt.split(",");
            return (
              <g key={i} className="group/node cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="var(--bg-base)"
                  stroke="var(--color-orange)"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}
        </svg>

        {/* X-Axis */}
        <div className="flex justify-between px-3 mt-1.5 text-[8px] font-mono-sos text-[var(--text-muted)] tracking-wider">
          {days.map((d, i) => (
            <span key={i} className="w-8 text-center">{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientRoster({ sessions }: { sessions: Session[] }) {
  const byClient = new Map<string, { name: string; count: number; next?: Session }>();
  for (const sess of sessions) {
    if (sess.status === "cancelled") continue;
    const entry = byClient.get(sess.clientId) ?? { name: sess.clientName, count: 0 };
    entry.count += 1;
    if (sess.status === "scheduled" && (!entry.next || (sess.startsAt ?? "") < (entry.next.startsAt ?? ""))) {
      entry.next = sess;
    }
    byClient.set(sess.clientId, entry);
  }
  const clients = [...byClient.values()];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex-1 xl:h-full xl:min-h-0 flex flex-col">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary)]/70"></div>
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Your Clients</h3>
        <span className="text-[8px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full font-mono-sos">{clients.length}</span>
      </div>

      <div className="space-y-3 overflow-y-auto scrollbar-thin min-h-0">
        {clients.length === 0 && (
          <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest py-4">No bookings yet</p>
        )}
        {clients.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-3 p-4 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-2xl">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{c.name}</p>
              <p className="text-[9px] font-mono-sos text-[var(--text-faint)] truncate">
                {c.next ? `Next: ${c.next.date} • ${c.next.time}` : "No upcoming session"}
              </p>
            </div>
            <span className="text-[9px] font-mono-sos text-[var(--text-muted)] shrink-0">{c.count} {c.count === 1 ? "session" : "sessions"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpertDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expertName, setExpertName] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadExpertDashboard() {
      try {
        const [profile, mySessions, myPayments] = await Promise.all([
          getMyProfile(),
          getMySessions(),
          getMyPayments(),
        ]);
        if (profile) setExpertName(profile.fullName);
        setSessions(mySessions);
        setPayments(myPayments);
      } catch (err) {
        console.error("Error loading expert dashboard data", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    }

    loadExpertDashboard();
  }, []);

  // Sessions are already scoped to the signed-in expert by RLS — no client-side filter needed.
  const nextSession = sessions.find(s => s.status === "scheduled");

  const completed = sessions.filter(s => s.status === "completed");
  const totalHours = completed.reduce((n, s) => n + s.durationMinutes, 0) / 60;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayHours = last7.map(d => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const mins = completed
      .filter(s => s.startsAt && new Date(s.startsAt) >= d && new Date(s.startsAt) < next)
      .reduce((n, s) => n + s.durationMinutes, 0);
    return mins / 60;
  });
  const dayLabels = last7.map(d => d.toLocaleDateString("en-US", { weekday: "short" }));
  const earned = payments.filter(p => p.status === "paid").reduce((n, p) => n + p.amountInr, 0);
  const toConfirm = payments.filter(p => p.status === "processing").length;

  return (
    <div className="w-full h-full relative flex flex-col pb-12 xl:pb-0 min-h-0">
      {/* 1. HEADER SECTION */}
      <header className="mb-12 mt-4 flex flex-row justify-between items-end gap-6 shrink-0">
        <div>
          <h1 className="font-inter text-3xl md:text-4xl font-light tracking-[0.18em] text-[var(--text-primary)] uppercase">Overview</h1>
          <p className="font-mono-sos text-xs text-[var(--text-faint)] mt-2 tracking-widest uppercase">Welcome back{expertName ? `, ${expertName}` : ""}</p>
          {loadError && <p className="font-mono-sos text-xs text-[var(--color-orange)] mt-2">{loadError}</p>}
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/dashboard/expert/sessions" title="Sessions" className="relative p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--color-orange)] transition-colors group shadow-lg">
            <Bell size={24} className="text-[var(--text-muted)] group-hover:text-[var(--color-orange)] transition-colors" />
            {toConfirm > 0 && (
              <span className="absolute top-3 right-3 w-3 h-3 bg-[var(--color-orange)] rounded-full border-2 border-[var(--bg-surface)]"></span>
            )}
          </Link>
        </div>
      </header>

      {/* 2. THREE COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 flex-1 w-full min-h-0 pb-12 xl:pb-0">
        
        {/* COLUMN 1: PERFORMANCE STATS */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex-1 xl:h-full xl:min-h-0 flex flex-col">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-orange)] to-[var(--color-orange)]/70"></div>
            <div className="flex justify-between items-start mb-4 px-4">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Performance Metrics</h3>
            </div>
            
            <div className="flex flex-col gap-4 px-4 flex-1 justify-between min-h-0">
              <div className="w-full">
                <p className="text-xs font-inter text-[var(--text-muted)] font-semibold mb-1">Total Consulting Hours</p>
                <h2 className="font-display text-4xl font-bold text-[var(--text-primary)]">{totalHours.toFixed(1)} <span className="text-lg text-[var(--text-faint)]">hrs</span></h2>
                
                {/* SVG Hours Line Chart */}
                <HoursLineChart data={dayHours} days={dayLabels} />
              </div>

              <div className="w-full flex flex-col gap-3 mt-auto border-t border-[var(--border)] pt-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-[var(--text-muted)]">Paid by clients</span>
                  <span className="text-[var(--text-primary)]">{formatInr(earned)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[var(--text-faint)] uppercase tracking-wider font-mono-sos">
                  <span>UPI payments to confirm</span>
                  <span>{toConfirm}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: NEXT CLIENT SESSION */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group flex flex-col xl:h-full xl:min-h-0 shadow-lg">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary)]/70"></div>
            <h3 className="text-xs font-mono-sos mb-6 text-[var(--text-faint)] tracking-widest uppercase">Next Consultation</h3>
            
            {nextSession ? (
              <div className="flex flex-col h-full">
                <h2 className="font-display text-3xl font-bold mb-2 text-[var(--text-primary)]">{nextSession.title}</h2>
                <p className="text-xs text-[var(--color-primary)] font-mono-sos flex items-center gap-2 mb-2">
                  <Clock size={14} /> {nextSession.date} • {nextSession.time}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-inter mb-6">
                  Client: {nextSession.clientName}
                </p>

                <div className="w-full mt-auto">
                  {nextSession.paymentStatus === "unpaid" ? (
                    <p className="text-center text-[11px] font-mono-sos uppercase tracking-widest text-[var(--text-muted)] py-4">
                      The call room opens once the client has paid
                    </p>
                  ) : (
                  <Link
                    href={`/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.title)}`}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] py-4 rounded-2xl text-xs font-bold transition-all hover:border-[var(--color-primary)] group/join"
                  >
                    <Video size={16} className="text-[var(--text-muted)] group-hover/join:text-[var(--color-primary)] transition-colors" /> Start Video Call
                  </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">No Scheduled Consultations</p>
                <Link href="/dashboard/expert/sessions" className="mt-4 text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors uppercase tracking-wider">View All Sessions &rarr;</Link>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: CLIENT MANAGER ROSTER */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          <ClientRoster sessions={sessions} />
        </div>

      </div>
    </div>
  );
}
