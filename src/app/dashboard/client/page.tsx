"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Video, X, Star, MapPin, Clock, Bell, AlertTriangle, CreditCard, ArrowRight, ShieldAlert, Edit2, Check, FileDown, CheckCircle2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

function ClockPicker({ initialTime, onChange }: { initialTime: string, onChange: (t: string) => void }) {
  const [mode, setMode] = useState<'h'|'m'>('h');
  
  // Parse initialTime (e.g. "10:00 AM")
  const parsed = initialTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  const initialHour = parsed ? parseInt(parsed[1], 10) : 10;
  const initialMinute = parsed ? parseInt(parsed[2], 10) : 0;
  const initialAmpm = parsed ? (parsed[3].toUpperCase() as 'AM'|'PM') : 'AM';

  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [ampm, setAmpm] = useState<'AM'|'PM'>(initialAmpm);

  useEffect(() => {
    const hStr = hour.toString().padStart(2, '0');
    const mStr = minute.toString().padStart(2, '0');
    onChange(`${hStr}:${mStr} ${ampm}`);
  }, [hour, minute, ampm, onChange]);

  // Generate 12 positions
  const items = mode === 'h' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="bg-[var(--bg-surface-2)] p-6 rounded-[32px] border border-[var(--border-strong)] flex flex-col items-center select-none shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-2 text-4xl font-display font-bold mb-6 bg-[var(--bg-base)] px-6 py-4 rounded-2xl border border-[var(--border)] shadow-inner">
        <span onClick={() => setMode('h')} className={`cursor-pointer transition-colors ${mode === 'h' ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          {hour.toString().padStart(2, '0')}
        </span>
        <span className="text-[var(--text-muted)] animate-pulse">:</span>
        <span onClick={() => setMode('m')} className={`cursor-pointer transition-colors ${mode === 'm' ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          {minute.toString().padStart(2, '0')}
        </span>
        <div className="flex flex-col text-sm ml-4 justify-center gap-2 font-mono-sos font-bold">
          <span onClick={() => setAmpm('AM')} className={`cursor-pointer transition-colors ${ampm === 'AM' ? 'text-[var(--color-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`}>AM</span>
          <span onClick={() => setAmpm('PM')} className={`cursor-pointer transition-colors ${ampm === 'PM' ? 'text-[var(--color-primary)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`}>PM</span>
        </div>
      </div>

      {/* Clock Face */}
      <div className="relative w-[260px] h-[260px] rounded-full bg-[var(--bg-base)] flex items-center justify-center border border-[var(--border-strong)] shadow-inner">
        {/* Center dot */}
        <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] absolute z-10 shadow-[0_0_15px_var(--color-primary)]"></div>
        
        {/* Clock Hand */}
        <div 
          className="absolute w-[2px] bg-[var(--color-primary)] origin-bottom z-0"
          style={{
            height: '95px',
            bottom: '130px',
            transform: `rotate(${mode === 'h' ? (hour % 12) * 30 : (minute / 5) * 30}deg)`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {/* Hand Knob */}
          <div className="absolute -top-4 -left-[15px] w-8 h-8 rounded-full bg-[var(--color-primary)]/20 border-[3px] border-[var(--color-primary)] backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]"></div>
        </div>

        {/* Numbers */}
        {items.map((num, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * 105; // 105px radius for numbers
          const y = Math.sin(angle) * 105;
          const isActive = mode === 'h' ? (num === hour || (num === 12 && hour === 0)) : num === minute;

          return (
            <div 
              key={num}
              onClick={() => {
                if (mode === 'h') {
                  setHour(num);
                  setTimeout(() => setMode('m'), 400); // auto switch to minutes
                } else {
                  setMinute(num);
                }
              }}
              className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer transition-all z-20 ${isActive ? 'text-white' : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'}`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              {num.toString().padStart(2, '0')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiquidWaveGauge({ percentage, balance }: { percentage: number, balance: number }) {
  const pct = Math.max(0, Math.min(100, percentage));
  const yLevel = 100 - pct;

  let color = "var(--color-green)";
  if (pct < 30) {
    color = "var(--color-orange)";
  } else if (pct < 60) {
    color = "var(--color-primary)";
  }

  return (
    <div className="relative w-44 h-44 flex items-center justify-center select-none mx-auto">
      {/* Outer Glow Ring */}
      <div 
        className="absolute inset-0 rounded-full border flex items-center justify-center p-2 shadow-2xl transition-all duration-500"
        style={{ borderColor: color, boxShadow: `0 0 20px ${color}1A` }}
      >
        {/* Inner Circle Frame */}
        <div className="w-full h-full rounded-full bg-[var(--bg-base)] border border-[var(--border)] overflow-hidden relative">
          
          {/* Animated SVG Wave */}
          <svg 
            viewBox="0 0 100 100" 
            className="absolute inset-0 w-full h-full transition-all duration-700 ease-out"
            style={{ transform: `translateY(${yLevel}%)` }}
          >
            {/* Background Wave */}
            <path 
              d="M0 20 C 30 15, 70 25, 100 20 L 100 100 L 0 100 Z" 
              fill={color} 
              opacity="0.15"
              className="animate-wave-slow"
              style={{ transformOrigin: "50% 50%" }}
            />
            {/* Foreground Wave */}
            <path 
              d="M0 20 C 30 25, 70 15, 100 20 L 100 100 L 0 100 Z" 
              fill={color} 
              opacity="0.4"
              className="animate-wave-fast"
              style={{ transformOrigin: "50% 50%" }}
            />
          </svg>

          {/* Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 font-inter">
            <span className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Balance</span>
            <span className="text-2xl font-bold text-[var(--text-primary)]">₹{balance.toLocaleString()}</span>
            <span className="text-[9px] font-mono-sos text-[var(--text-muted)] tracking-wider mt-1">{pct.toFixed(0)}% Left</span>
          </div>

        </div>
      </div>
      
      <style jsx global>{`
        @keyframes wave-shift-slow {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-25%) scaleY(1.05); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes wave-shift-fast {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(25%) scaleY(0.95); }
          100% { transform: translateX(0) scaleY(1); }
        }
        .animate-wave-slow {
          animation: wave-shift-slow 6s ease-in-out infinite;
        }
        .animate-wave-fast {
          animation: wave-shift-fast 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const width = 280;
  const height = 44;
  const padding = 4;
  
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="flex flex-col gap-2 mt-5">
      <div className="flex justify-between items-center text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">
        <span>Balance Trend</span>
        <span>Peak: ₹{max.toLocaleString()}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible w-full">
        <defs>
          <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-green)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-green)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <path
          d={`M ${points.split(" ")[0].split(",")[0]},${height} L ${points.replace(/ /g, " L ")} L ${points.split(" ")[points.split(" ").length - 1].split(",")[0]},${height} Z`}
          fill="url(#sparkline-grad)"
        />

        {/* Path line */}
        <polyline
          fill="none"
          stroke="var(--color-green)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="transition-all duration-500"
          style={{ filter: "drop-shadow(0px 2px 6px rgba(194, 217, 93, 0.35))" }}
        />
        
        {/* Active End Dot */}
        {points && (
          <circle
            cx={points.split(" ")[points.split(" ").length - 1].split(",")[0]}
            cy={points.split(" ")[points.split(" ").length - 1].split(",")[1]}
            r="4.5"
            fill="var(--color-green)"
          />
        )}
      </svg>
    </div>
  );
}

function EditableProjectPhase() {
  const [isEditing, setIsEditing] = useState(false);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    setPhase(getProjectPhase());
  }, []);

  const handleSave = () => {
    saveProjectPhase(phase);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-2xl px-5 py-3 relative group shadow-sm mt-3 w-full sm:w-max max-w-full">
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mb-1 flex items-center gap-1">
          <CheckCircle2 size={10} className="text-[var(--color-green)]" /> ACTIVE PROJECT STAGE
        </span>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={phase} 
              onChange={(e) => setPhase(e.target.value)} 
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] font-bold transition-all w-60 max-w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <button onClick={handleSave} className="p-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors" title="Save">
              <Check size={12} />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors" title="Cancel">
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <h4 className="font-inter text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">{phase || "No Active Phase Set"}</h4>
            <button 
              onClick={() => setIsEditing(true)} 
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
              title="Edit Project Phase"
            >
              <Edit2 size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { 
  getStoredSessions, 
  saveSessions, 
  getStoredMessages, 
  saveMessages, 
  getStoredInvoices, 
  saveInvoices, 
  getRetainerBalance, 
  saveRetainerBalance, 
  getProjectPhase, 
  saveProjectPhase,
  Session, 
  ChatMessage, 
  Invoice 
} from "@/utils/sessionsStore";
import { supabase } from "@/utils/supabase/client";

export default function ClientDashboard() {
  const [isBooking, setIsBooking] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState("10:00 AM");

  const [sessionType, setSessionType] = useState("Architecture Review");
  const [sessionDate, setSessionDate] = useState("2026-10-24");
  const [selectedExpert, setSelectedExpert] = useState("Shravani Reddy");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [dbExperts, setDbExperts] = useState<any[]>([]);
  const [currentExpert, setCurrentExpert] = useState<any>({
    id: "789e4567-e89b-12d3-a456-426614174000",
    full_name: "Shravani Reddy",
    phone: "+919876543210",
    email: "shravani@sos.com",
    role: "expert"
  });

  // Billing states
  const [balance, setBalance] = useState(15000);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([]);

  // Time of Day and Timezone Offsets
  const [greeting, setGreeting] = useState("Hello");
  const [localTimeStr, setLocalTimeStr] = useState("");

  const nextSession = sessions.filter(s => s.status === "scheduled")[0];

  useEffect(() => {
    // Dynamic Greeting & Time Clock
    const updateTimeContext = () => {
      const now = new Date();
      const hrs = now.getHours();
      if (hrs < 12) setGreeting("Good morning");
      else if (hrs < 17) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      setLocalTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }));
    };

    updateTimeContext();
    const interval = setInterval(updateTimeContext, 30000);

    // Load initial data
    const bal = getRetainerBalance();
    setBalance(bal);
    setInvoices(getStoredInvoices());
    setBalanceHistory([15000, 12500, 10000, bal]);

    async function loadDashboardData() {
      const fallbackExperts = [
        {
          id: "789e4567-e89b-12d3-a456-426614174000",
          full_name: "Shravani Reddy",
          phone: "+919876543210",
          email: "shravani@sos.com",
          role: "expert"
        }
      ];
      setDbExperts(fallbackExperts);

      if (!supabase) {
        const localSess = getStoredSessions();
        setSessions(localSess);
        
        const platterSelected = localStorage.getItem("platter_selected_expert");
        if (platterSelected) {
          const match = fallbackExperts.find(e => e.id === platterSelected);
          if (match) {
            setCurrentExpert(match);
            setSelectedExpert(match.full_name);
          }
          localStorage.removeItem("platter_selected_expert");
        } else if (localSess.length > 0) {
          const lastSess = localSess[0];
          const match = fallbackExperts.find(e => e.full_name === lastSess.expert);
          if (match) {
            setCurrentExpert(match);
            setSelectedExpert(match.full_name);
          }
        }
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: expertsData } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "expert");
        
        const activeExperts = (expertsData && expertsData.length > 0) ? expertsData : fallbackExperts;
        setDbExperts(activeExperts);

        let mappedSess: Session[] = [];
        if (user) {
          const { data: sessionsData } = await supabase
            .from("sessions")
            .select("*")
            .eq("client_id", user.id)
            .order("scheduled_at", { ascending: false });
          
          if (sessionsData) {
            mappedSess = sessionsData.map((s: any) => {
              const exp = activeExperts.find(e => e.id === s.expert_id);
              const dt = new Date(s.scheduled_at);
              return {
                id: s.id,
                name: "Consultation Session",
                client: "Client User",
                expert: exp ? exp.full_name : "Shravani Reddy",
                date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                status: (s.status === "completed" || s.status === "scheduled") ? s.status : "scheduled",
                duration: `${s.duration_minutes || 60} min`
              };
            });
          }
        }

        if (mappedSess.length === 0) {
          mappedSess = getStoredSessions();
        }
        setSessions(mappedSess);

        const platterSelected = localStorage.getItem("platter_selected_expert");
        let targetExpert = activeExperts[0];

        if (platterSelected) {
          const match = activeExperts.find(e => e.id === platterSelected);
          if (match) targetExpert = match;
          localStorage.removeItem("platter_selected_expert");
        } else if (mappedSess.length > 0) {
          const lastSessExpertName = mappedSess[0].expert;
          const match = activeExperts.find(e => e.full_name === lastSessExpertName);
          if (match) targetExpert = match;
        }

        if (targetExpert) {
          setCurrentExpert(targetExpert);
          setSelectedExpert(targetExpert.full_name);
        }
      } catch (err) {
        console.error("Error loading client dashboard data", err);
        setSessions(getStoredSessions());
      }
    }

    loadDashboardData();
    return () => clearInterval(interval);
  }, []);

  const handleConfirmBooking = async () => {
    const formattedDate = new Date(sessionDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    const targetExpertObj = dbExperts.find(e => e.full_name === selectedExpert) || currentExpert;

    // Deduct cost and generate invoice
    const cost = 2500;
    const newBalance = Math.max(0, balance - cost);
    setBalance(newBalance);
    saveRetainerBalance(newBalance);

    const invoiceNum = `INV-2026-00${invoices.length + 1}`;
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNum,
      description: `${sessionType} with ${selectedExpert}`,
      amount: cost,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "paid"
    };

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    saveInvoices(updatedInvoices);
    setBalanceHistory(prev => [...prev, newBalance]);

    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          let hours = 10;
          let minutes = 0;
          if (timeMatch) {
            hours = parseInt(timeMatch[1], 10);
            minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === "PM" && hours < 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;
          }
          
          const scheduledDate = new Date(sessionDate);
          scheduledDate.setHours(hours, minutes, 0, 0);

          await supabase
            .from("sessions")
            .insert({
              client_id: user.id,
              expert_id: targetExpertObj.id,
              scheduled_at: scheduledDate.toISOString(),
              duration_minutes: 60,
              status: "scheduled"
            });
        }
      } catch (err) {
        console.error("Failed to insert session in DB", err);
      }
    }

    const newSession: Session = {
      id: `sess-${Date.now()}`,
      name: sessionType,
      client: "Client User",
      expert: selectedExpert,
      date: formattedDate,
      time: selectedTime,
      status: "scheduled",
      duration: "60 min"
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    saveSessions(updatedSessions);

    const expertId = selectedExpert === "Shravani Reddy" ? 1 : 2;
    const currentMsgs = getStoredMessages();
    const newMsg: ChatMessage = {
      id: Date.now(),
      expertId,
      sender: "client",
      text: `Hello! I just booked a new session: "${sessionType}" for ${formattedDate} at ${selectedTime}.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    saveMessages([...currentMsgs, newMsg]);

    setIsBooking(false);
    setShowTimePicker(false);
  };

  return (
    <div className="w-full h-full relative flex flex-col pb-12 xl:pb-0 min-h-0">
      {/* 1. HEADER SECTION & NOTIFICATIONS */}
      <header className="mb-6 xl:mb-8 mt-2 flex flex-row justify-between items-end gap-6 shrink-0">
        <div>
          <h1 className="font-inter text-3xl md:text-4xl font-light tracking-[0.18em] text-[var(--text-primary)] uppercase">Overview</h1>
          <p className="font-mono-sos text-xs text-[var(--text-faint)] mt-2 tracking-widest uppercase">{greeting}, Client • {localTimeStr}</p>
          <EditableProjectPhase />
        </div>
        <div className="flex gap-4 items-center">
          {/* Notification Bell */}
          <button className="relative p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--color-primary)] transition-colors group shadow-lg">
            <Bell size={24} className="text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-[var(--color-orange)] rounded-full border-2 border-[var(--bg-surface)] animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* 2. THREE COLUMN LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 w-full min-h-0 pb-12 xl:pb-0">
        
        {/* COLUMN 1: FINANCIALS & OPERATIONS */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          
          {/* FINANCIAL STATUS WIDGET */}
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex flex-col flex-1 xl:h-full xl:min-h-0">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-green)] to-[var(--color-green)]/70"></div>
            <div className="flex justify-between items-start mb-6 px-4">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Financial Status</h3>
              <button 
                onClick={() => alert("Invoice and accounting summary downloaded successfully.")}
                className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--color-green)] transition-colors uppercase tracking-widest flex items-center gap-1 font-mono-sos"
              >
                Invoices Summary <ArrowRight size={12} />
              </button>
            </div>
            
            <div className="flex flex-col gap-6 flex-1 justify-between min-h-0 px-4">
              <div className="w-full">
                {/* Custom SVG Liquid Fill Gauge */}
                <LiquidWaveGauge percentage={(balance / 15000) * 100} balance={balance} />
                
                {/* SVG Sparkline */}
                <Sparkline data={balanceHistory} />
              </div>

              {/* Invoices List */}
              <div className="mt-4 border-t border-[var(--border)] pt-4 w-full">
                <div className="flex justify-between items-center text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mb-3">
                  <span>Billing Records</span>
                  <span>Auto-Logged</span>
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-2 scrollbar-thin pr-1">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="p-3 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl flex items-center justify-between group/inv transition-colors hover:border-[var(--border-strong)]">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{inv.description}</p>
                        <p className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-wider mt-0.5">{inv.invoiceNumber} • {inv.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[var(--text-primary)]">₹{inv.amount}</span>
                        <button 
                          onClick={() => alert(`Receipt downloaded for ${inv.invoiceNumber}: "Consultation Payment Receipt for ${inv.description} - Amount: ₹${inv.amount}"`)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-faint)] group-hover/inv:text-[var(--color-green)] transition-all border border-transparent hover:border-[var(--border-strong)]"
                          title="Download PDF Receipt"
                        >
                          <FileDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full flex flex-col gap-3 mt-auto">
                <button className="w-full py-4 bg-[var(--bg-surface-2)] hover:bg-[var(--color-primary-deep)]/20 border border-[var(--border-strong)] text-[var(--text-primary)] rounded-2xl text-sm font-bold transition-all hover:border-[var(--color-primary)] flex items-center justify-center gap-2 group/topup">
                  <CreditCard size={16} className="text-[var(--text-muted)] group-hover/topup:text-[var(--color-primary)] transition-colors" /> Top-Up Retainer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: VAULT LOGS & MESSAGES HUB */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col flex-1 shadow-lg relative overflow-hidden min-h-[400px] xl:min-h-0 xl:h-full">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-orange)]"></div>
            
            {/* Upper Pane: Recent Messages */}
            <div className="xl:flex-[6] flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-3 px-4">
                <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Recent Messages</h3>
                <Link 
                  href="/dashboard/client/chat" 
                  className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest flex items-center gap-1 font-mono-sos"
                >
                  Open Chat <ArrowRight size={10}/>
                </Link>
              </div>

              {/* Chat timeline box */}
              <div className="flex-1 overflow-y-auto px-4 space-y-4 min-h-[100px] xl:min-h-0 scrollbar-thin">
                <div className="flex flex-col items-start gap-1">
                  <div className="bg-[var(--bg-surface-2)] border border-[var(--border-strong)] p-4 rounded-2xl rounded-tl-sm text-sm text-[var(--text-muted)] leading-relaxed max-w-[90%] shadow-inner relative">
                    <p className="font-inter font-light text-[13px] text-[var(--text-muted)]">Please upload the latest blueprints to the vault before our next session so I can review the changes.</p>
                  </div>
                  <span className="text-[8px] font-mono-sos text-[var(--text-faint)] tracking-widest pl-2">TODAY • 10:42 AM</span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 p-4 rounded-2xl rounded-tr-sm text-sm text-[var(--text-muted)] leading-relaxed max-w-[90%] shadow-inner relative">
                    <p className="font-inter font-light text-[13px] text-[var(--text-primary)]">Got it. Uploading the structural specs and site photos now.</p>
                  </div>
                  <span className="text-[8px] font-mono-sos text-[var(--text-faint)] tracking-widest pr-2">TODAY • 10:45 AM</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 my-5 border-t border-[var(--border-strong)] opacity-50 relative shrink-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-[var(--bg-surface-2)] text-[8px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase rounded-full border border-[var(--border)] py-0.5">Secure Collaboration</div>
            </div>

            {/* Lower Pane: Safe Activity Logs (Friendly Language) */}
            <div className="xl:flex-[4] shrink-0 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-3 px-4 shrink-0">
                <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Safe Activity Logs</h3>
                <Link 
                  href="/dashboard/client/vault" 
                  className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--color-orange)] transition-colors uppercase tracking-widest flex items-center gap-1 font-mono-sos"
                >
                  Open Vault <ArrowRight size={10}/>
                </Link>
              </div>

              {/* Safe Friendly Logs List */}
              <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-[100px] xl:min-h-0 scrollbar-thin">
                <div className="flex gap-2.5 items-start text-[11px] font-inter leading-relaxed text-[var(--text-muted)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] mt-1.5 shrink-0 shadow-[0_0_6px_var(--color-green)]"></div>
                  <p>Shravani opened <span className="text-[var(--text-primary)] font-semibold">Project_Brief_v2.pdf</span> to review your floor plans at 10:42 AM.</p>
                </div>
                <div className="flex gap-2.5 items-start text-[11px] font-inter leading-relaxed text-[var(--text-muted)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0"></div>
                  <p>Vault verified signature & integrity of <span className="text-[var(--text-primary)] font-semibold">Initial_Sketches.png</span> at 10:20 AM.</p>
                </div>
                <div className="flex gap-2.5 items-start text-[11px] font-inter leading-relaxed text-[var(--text-muted)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0"></div>
                  <p>Admin uploaded your signed agreement <span className="text-[var(--text-primary)] font-semibold">Contract_Signed.pdf</span> on Oct 15.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: UNIFIED EXPERT HUB */}
        <div className="flex flex-col gap-8 xl:h-full xl:min-h-0">
          
          {/* EXPERT COMMAND CENTER CARD */}
          <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col relative overflow-hidden shadow-lg flex-1 min-h-[350px] xl:min-h-0 xl:h-full">
            {/* SOS Panic Button */}
            <button className="absolute top-6 right-6 p-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--color-orange)]/10 hover:border-[var(--color-orange)]/50 transition-all group/sos shadow-md z-20" title="Trigger SOS Emergency Alert">
              <ShieldAlert size={20} className="text-[var(--color-orange)]/70 group-hover/sos:text-[var(--color-orange)] transition-colors" />
            </button>

            <h3 className="text-xs font-mono-sos mb-6 px-4 text-[var(--text-faint)] tracking-widest uppercase w-full text-left">Your Expert Hub</h3>
            
            {/* Profile Info */}
            <div className="flex items-center gap-5 mb-6 px-4 shrink-0">
              <div className="w-16 h-16 rounded-full p-0.5 border border-[var(--border-strong)] relative shrink-0">
                <div className="w-full h-full rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center overflow-hidden">
                  <Star size={20} className="text-[var(--color-primary)] opacity-50" />
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--color-green)] border-[2.5px] border-[var(--bg-base)] rounded-full"></div>
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-inter text-xl font-bold text-[var(--text-primary)] mb-0.5 truncate">{currentExpert.full_name || "Shravani Reddy"}</h2>
                <p className="text-xs font-inter text-[var(--color-primary)] font-semibold mb-1 truncate">Lead Architectural Consultant</p>
                <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-mono-sos">
                  <MapPin size={9} className="text-[var(--text-faint)] shrink-0" /> <span className="truncate">Hyderabad (IST)</span>
                </div>
              </div>
            </div>

            {/* Next Session Section */}
            {nextSession ? (
              <div className="mx-4 mb-6 p-5 rounded-2xl border border-[var(--border-strong)] bg-white/[0.02] relative group/sess-card min-h-0 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-20 h-6 rounded-tr-2xl rounded-bl-2xl bg-[var(--color-primary)]/10 flex items-center justify-center border-l border-b border-[var(--border-strong)] text-[8px] font-mono-sos text-[var(--color-primary)] uppercase tracking-wider">Scheduled</div>
                <div>
                  <p className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mb-1">Upcoming Session</p>
                  <h4 className="font-inter text-base font-bold text-[var(--text-primary)] mb-1 truncate">{nextSession.name}</h4>
                  <p className="text-xs text-[var(--color-primary)] font-mono-sos flex items-center gap-1.5 mb-4">
                    <Clock size={12} className="shrink-0" /> {nextSession.date} • {nextSession.time}
                  </p>
                </div>
                
                <Link 
                  href={`/dashboard/video-call?sessionId=${nextSession.id}&sessionName=${encodeURIComponent(nextSession.name)}&displayName=Client`}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] py-3.5 rounded-xl text-xs font-bold transition-all hover:border-[var(--color-primary)] group/join"
                >
                  <Video size={14} className="text-[var(--text-muted)] group-hover/join:text-[var(--color-primary)] transition-colors" /> Join Video Call
                </Link>
              </div>
            ) : (
              <div className="mx-4 mb-6 p-5 rounded-2xl border border-dashed border-[var(--border)] text-center flex flex-col items-center justify-center bg-white/[0.01] flex-1">
                <p className="text-[10px] text-[var(--text-faint)] font-mono-sos uppercase tracking-wider mb-3">No Scheduled Meetings</p>
                <button 
                  onClick={() => setIsBooking(true)} 
                  className="px-4 py-2.5 border border-[var(--border-strong)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold tracking-widest text-[9px] rounded-xl transition-all hover:border-[var(--color-primary)] uppercase"
                >
                  Schedule Session
                </button>
              </div>
            )}

            {/* General Actions */}
            {nextSession && (
              <div className="px-4 w-full shrink-0">
                <button 
                  onClick={() => setIsBooking(true)} 
                  className="w-full border border-[var(--border-strong)] hover:border-[var(--color-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] py-3 rounded-xl text-xs font-bold transition-all mb-4 uppercase tracking-wider font-mono-sos text-[10px]"
                >
                  Schedule Another Session
                </button>
              </div>
            )}
            
            {/* Sent Invitations / Requests */}
            <div className="mt-auto px-4 shrink-0">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-mono-sos text-[var(--text-faint)] uppercase tracking-widest">Pending Requests</span>
                <span className="text-[var(--text-muted)] flex items-center gap-1"><MoreHorizontal size={12}/> 1</span>
              </div>
              <div className="bg-[var(--bg-surface-2)] rounded-2xl p-4 border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] flex items-center justify-between shadow-inner">
                 <span className="font-inter text-xs text-[var(--text-muted)] font-semibold">Follow-up Call</span>
                 <span className="text-[8px] uppercase tracking-widest font-bold text-[var(--color-orange)] bg-[var(--color-orange)]/10 px-2 py-0.5 rounded-full border border-[var(--color-orange)]/20 font-mono-sos">Awaiting</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Book New Modal Overlay */}
      <AnimatePresence>
        {isBooking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[var(--bg-overlay)] backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="glass-panel p-10 max-w-lg w-full relative border-organic shadow-[0_40px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
            >
              <button 
                onClick={() => setIsBooking(false)}
                className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-inter text-3xl font-light tracking-[0.10em] uppercase mb-4 text-embossed">Book a Session</h2>
              <p className="text-xs text-[var(--text-muted)] mb-10 uppercase font-mono-sos tracking-widest">₹2,500 consultation fee auto-deducted from retainer</p>
              
              <div className="space-y-6 mb-10">
                <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">SESSION TYPE</label>
                  <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer">
                    <option>Architecture Review</option>
                    <option>Design Consultation</option>
                    <option>Follow-up</option>
                  </select>
                </div>
                 <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">ASSIGNED EXPERT</label>
                  <select value={selectedExpert} onChange={(e) => setSelectedExpert(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer">
                    {dbExperts.map(exp => (
                      <option key={exp.id} value={exp.full_name}>{exp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">DATE & TIME</label>
                  <div className="flex gap-4">
                    <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="flex-1 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] [color-scheme:dark] transition-colors shadow-inner font-bold" />
                    
                    {/* CUSTOM CLOCK TRIGGER */}
                    <div className="flex-1 relative">
                      <button 
                        onClick={() => setShowTimePicker(!showTimePicker)}
                        className="w-full h-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm text-left outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner flex items-center justify-between font-bold"
                      >
                        {selectedTime}
                        <Clock size={18} className="text-[var(--color-primary)] opacity-80" />
                      </button>
                      
                      <AnimatePresence>
                        {showTimePicker && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            className="absolute top-[110%] right-0 z-50 origin-top-right"
                          >
                            <ClockPicker 
                              initialTime={selectedTime} 
                              onChange={(t) => {
                                setSelectedTime(t);
                              }} 
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleConfirmBooking}
                className="btn-sos-filled w-full py-5 text-lg text-center justify-center rounded-2xl tracking-widest mt-8 shadow-lg"
              >
                Confirm Booking
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
