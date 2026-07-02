"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, Video, ArrowRight, Edit2, Check, X, ShieldAlert, Award } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getStoredSessions, getStoredFiles, getProjectPhase, saveProjectPhase, Session, VaultFile } from "@/utils/sessionsStore";
import { supabase } from "@/utils/supabase/client";

function HoursLineChart() {
  const data = [4, 6.5, 5, 8.5, 6, 4.5, 4];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const max = Math.max(...data);
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
        <span>Daily Hours Log</span>
        <span>Peak: 8.5h</span>
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

function ClientManager() {
  const [phase, setPhase] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setPhase(getProjectPhase());
  }, []);

  const handleSave = () => {
    saveProjectPhase(phase);
    setIsEditing(false);
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex-1 xl:h-full xl:min-h-0 flex flex-col">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary)]/70"></div>
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Client Manager</h3>
        <span className="text-[8px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full font-mono-sos">Active</span>
      </div>

      <div className="flex items-center gap-4 mb-6 p-4 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-strong)] flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://api.dicebear.com/7.x/shapes/svg?seed=SOS1&backgroundColor=transparent" alt="Client User" className="w-full h-full p-1 opacity-80" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--text-primary)] truncate">Client User</p>
          <p className="text-[9px] font-mono-sos text-[var(--text-faint)] truncate">client@sos.com</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[9px] font-mono-sos text-[var(--text-faint)] mb-2 tracking-widest uppercase">PROJECT STAGE</label>
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl px-4 py-2 text-xs outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsEditing(false);
                }}
              />
              <button onClick={handleSave} className="p-2 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] transition-colors">
                <Check size={14} />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-2 rounded-xl bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl group/phase hover:border-[var(--border-strong)] transition-all">
              <span className="text-xs text-[var(--text-primary)] font-bold truncate pr-3">{phase}</span>
              <button onClick={() => setIsEditing(true)} className="text-[var(--text-faint)] hover:text-[var(--color-primary)] transition-colors">
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExpertDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [expertName, setExpertName] = useState("Shravani Reddy");
  const [expertId, setExpertId] = useState("789e4567-e89b-12d3-a456-426614174000");

  useEffect(() => {
    async function loadExpertDashboard() {
      setFiles(getStoredFiles());

      if (!supabase) {
        const localSess = getStoredSessions();
        const filtered = localSess.map(s => ({
          ...s,
          expert: "Shravani Reddy"
        }));
        setSessions(filtered);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        let currentExpName = "Shravani Reddy";
        let currentExpId = "789e4567-e89b-12d3-a456-426614174000";

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, id")
            .eq("id", user.id)
            .single();
          
          if (profile) {
            currentExpName = profile.full_name;
            currentExpId = profile.id;
            setExpertName(profile.full_name);
            setExpertId(profile.id);
          }
        }

        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("*")
          .eq("expert_id", currentExpId)
          .order("scheduled_at", { ascending: false });

        let mappedSess: Session[] = [];
        if (sessionsData && sessionsData.length > 0) {
          const clientIds = Array.from(new Set(sessionsData.map((s: any) => s.client_id)));
          const { data: clientsData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", clientIds);

          mappedSess = sessionsData.map((s: any) => {
            const clientProf = clientsData?.find((c: any) => c.id === s.client_id);
            const dt = new Date(s.scheduled_at);
            return {
              id: s.id,
              name: "Consultation Session",
              client: clientProf ? clientProf.full_name : "Client User",
              expert: currentExpName,
              date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              status: (s.status === "completed" || s.status === "scheduled") ? s.status : "scheduled",
              duration: `${s.duration_minutes || 60} min`
            };
          });
        } else {
          const localSess = getStoredSessions();
          mappedSess = localSess.map(s => ({
            ...s,
            expert: currentExpName
          }));
        }

        setSessions(mappedSess);
      } catch (err) {
        console.error("Error loading expert dashboard data", err);
        const localSess = getStoredSessions();
        setSessions(localSess.map(s => ({ ...s, expert: expertName })));
      }
    }

    loadExpertDashboard();
  }, [expertName]);

  const mySessions = sessions.filter(s => s.expert === expertName);
  const nextSession = mySessions.find(s => s.status === "scheduled");

  return (
    <div className="w-full h-full relative flex flex-col pb-12 xl:pb-0 min-h-0">
      {/* 1. HEADER SECTION */}
      <header className="mb-12 mt-4 flex flex-row justify-between items-end gap-6 shrink-0">
        <div>
          <h1 className="font-inter text-3xl md:text-4xl font-light tracking-[0.18em] text-[var(--text-primary)] uppercase">Overview</h1>
          <p className="font-mono-sos text-xs text-[var(--text-faint)] mt-2 tracking-widest uppercase">Welcome back, {expertName}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button className="relative p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--color-orange)] transition-colors group shadow-lg">
            <Bell size={24} className="text-[var(--text-muted)] group-hover:text-[var(--color-orange)] transition-colors" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-[var(--color-orange)] rounded-full border-2 border-[var(--bg-surface)] animate-pulse"></span>
          </button>
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
                <h2 className="font-display text-4xl font-bold text-[var(--text-primary)]">38.5 <span className="text-lg text-[var(--text-faint)]">hrs</span></h2>
                
                {/* SVG Hours Line Chart */}
                <HoursLineChart />
              </div>

              <div className="w-full flex flex-col gap-3 mt-auto border-t border-[var(--border)] pt-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-[var(--text-muted)]">Monthly Earnings</span>
                  <span className="text-[var(--text-primary)]">₹1,15,500.00</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-[var(--text-faint)] uppercase tracking-wider font-mono-sos">
                  <span>Next payout</span>
                  <span>June 30, 2026</span>
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
                <h2 className="font-display text-3xl font-bold mb-2 text-[var(--text-primary)]">{nextSession.name}</h2>
                <p className="text-xs text-[var(--color-primary)] font-mono-sos flex items-center gap-2 mb-2">
                  <Clock size={14} /> {nextSession.date} • {nextSession.time}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-inter mb-6">
                  Client: {nextSession.client}
                </p>
                
                <div className="w-full mt-auto">
                  <Link 
                    href={`/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.name)}&displayName=${encodeURIComponent(expertName)}`}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] py-4 rounded-2xl text-xs font-bold transition-all hover:border-[var(--color-primary)] group/join"
                  >
                    <Video size={16} className="text-[var(--text-muted)] group-hover/join:text-[var(--color-primary)] transition-colors" /> Start Video Call
                  </Link>
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
          <ClientManager />
        </div>

      </div>
    </div>
  );
}
