"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Video, X, Star, MapPin, Clock, Bell, AlertTriangle, CreditCard, ArrowRight, ShieldAlert, MoreHorizontal } from "lucide-react";
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

import { getStoredSessions, saveSessions, getStoredMessages, saveMessages, Session, ChatMessage } from "@/utils/sessionsStore";

export default function ClientDashboard() {
  const [isBooking, setIsBooking] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState("10:00 AM");

  const [sessionType, setSessionType] = useState("Architecture Review");
  const [sessionDate, setSessionDate] = useState("2026-10-24");
  const [selectedExpert, setSelectedExpert] = useState("Dr. Sarah Jenkins");

  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setSessions(getStoredSessions());
    });
  }, []);

  const handleConfirmBooking = () => {
    const formattedDate = new Date(sessionDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

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

    // Send mock notification chat message to chat store
    const expertId = selectedExpert === "Dr. Sarah Jenkins" ? 1 : selectedExpert === "Michael Chen" ? 2 : 3;
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
    <div className="w-full h-full relative min-h-screen flex flex-col pb-24">
      {/* 1. HEADER SECTION & NOTIFICATIONS */}
      <header className="mb-12 mt-4 flex flex-row justify-between items-end gap-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">Overview</h1>
          <p className="font-mono-sos text-sm text-[var(--text-faint)] mt-2 tracking-widest uppercase">Welcome back, Client</p>
        </div>
        <div className="flex gap-4 items-center">
          {/* Notification Bell */}
          <button className="relative p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-cyan-400 transition-colors group shadow-lg">
            <Bell size={24} className="text-[var(--text-muted)] group-hover:text-cyan-400 transition-colors" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-[#ff5c5c] rounded-full border-2 border-[var(--bg-surface)] animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* 2. THREE COLUMN LAYOUT FOR MAXIMUM REAL ESTATE */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 flex-1 w-full">
        
        {/* COLUMN 1: FINANCIALS & OPERATIONS */}
        <div className="flex flex-col gap-8">
          
          {/* FINANCIAL STATUS WIDGET */}
          <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group shadow-lg flex-1">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
            <div className="flex justify-between items-start mb-8 pl-2">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Financial Status</h3>
              <button className="text-[10px] font-bold text-[var(--text-muted)] hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-1">View Invoices <ArrowRight size={12} /></button>
            </div>
            
            <div className="flex flex-col gap-8 pl-2">
              <div className="w-full">
                <p className="text-sm font-inter text-[var(--text-muted)] font-semibold mb-1">Retainer Balance</p>
                <h2 className="font-display text-4xl font-bold text-[var(--text-primary)]">₹15,000<span className="text-lg text-[var(--text-faint)]">.00</span></h2>
                
                <div className="mt-8 mb-2 flex justify-between text-xs font-inter font-bold text-[var(--text-muted)]">
                  <span>Budget Burn Rate</span>
                  <span className="text-emerald-400">42% Used</span>
                </div>
                {/* Dual Progress Bar */}
                <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden relative border border-[var(--border)]">
                  <div className="absolute top-0 left-0 h-full w-[65%] bg-[var(--bg-surface-2)]"></div> {/* Project % */}
                  <div className="absolute top-0 left-0 h-full w-[42%] bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div> {/* Burn Rate */}
                </div>
                <p className="text-[10px] text-[var(--text-faint)] mt-2 tracking-wide text-right font-mono-sos">PROJECT COMPLETION: 65%</p>
              </div>

              <div className="w-full flex flex-col gap-3 mt-auto">
                <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl flex items-center justify-between group/approval cursor-pointer hover:border-orange-400 transition-all shadow-inner">
                  <div className="flex items-center gap-3 text-sm font-semibold text-[var(--text-muted)] group-hover/approval:text-orange-400 transition-colors">
                    <AlertTriangle size={16} /> 1 Pending Approval
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">₹5,000</span>
                </div>
                <button className="w-full py-4 bg-[var(--bg-surface-2)] hover:bg-[#1f3763]/20 border border-[var(--border-strong)] text-[var(--text-primary)] rounded-2xl text-sm font-bold transition-all hover:border-[#3395ff] flex items-center justify-center gap-2 group/topup">
                  <CreditCard size={16} className="text-[var(--text-muted)] group-hover/topup:text-[#3395ff] transition-colors" /> Top-Up via Razorpay
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: MEETINGS & SECURE VAULT */}
        <div className="flex flex-col gap-8">
            {/* NEXT SESSION CARD */}
            <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] relative overflow-hidden group flex flex-col min-h-[300px] shadow-lg">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
              <h3 className="text-xs font-mono-sos mb-6 text-[var(--text-faint)] tracking-widest uppercase pl-2">Next Session</h3>
              {sessions.filter(s => s.status === 'scheduled').length > 0 ? (
                sessions.filter(s => s.status === 'scheduled').slice(0,1).map(session => (
                  <div key={session.id} className="flex flex-col h-full pl-2">
                    <h2 className="font-display text-3xl font-bold mb-2 text-[var(--text-primary)]">{session.name}</h2>
                    <p className="text-sm text-purple-400 font-mono-sos flex items-center gap-2 mb-auto">
                      <Clock size={14} /> {session.date} • {session.time}
                    </p>
                    
                    <p className="text-xs text-[var(--text-muted)] font-inter mb-4">
                      Expert: {session.expert}
                    </p>
                    
                    <div className="w-full mt-auto space-y-3">
                      <Link 
                        href={`/dashboard/video-call?sessionId=${session.id}&sessionName=${encodeURIComponent(session.name)}&displayName=Client`}
                        className="w-full flex items-center justify-center gap-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] py-4 rounded-2xl text-sm font-bold transition-all hover:border-purple-400 group/join"
                      >
                        <Video size={16} className="text-[var(--text-muted)] group-hover/join:text-purple-400 transition-colors" /> Join Video Call
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">No Scheduled Sessions</p>
                  <button onClick={() => setIsBooking(true)} className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider">Book Now &rarr;</button>
                </div>
              )}
            </div>

            {/* SECURE VAULT WIDGET */}
            <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col flex-1 shadow-lg relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-cyan-600"></div>
              <div className="flex justify-between items-center mb-6 pl-2">
                <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Secure Vault</h3>
                <Link href="/dashboard/client/vault" className="text-[10px] font-bold text-[var(--text-muted)] hover:text-cyan-400 transition-colors uppercase tracking-widest flex items-center gap-1">Open <ArrowRight size={10}/></Link>
              </div>
              <div className="space-y-4 flex-1 flex flex-col justify-center pl-2">
                <div className="p-4 border border-[var(--border)] rounded-2xl flex items-center gap-4 bg-[var(--bg-surface)] hover:border-cyan-400/50 transition-colors cursor-pointer group/file">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-strong)] flex items-center justify-center text-[9px] font-bold text-cyan-400 group-hover/file:bg-cyan-400/10 transition-colors">PDF</div>
                  <div className="truncate text-sm font-semibold text-[var(--text-muted)] group-hover/file:text-[var(--text-primary)] transition-colors">Floorplan_V2.pdf</div>
                </div>
                <div className="p-4 border border-[var(--border)] rounded-2xl flex items-center gap-4 bg-[var(--bg-surface)] hover:border-cyan-400/50 transition-colors cursor-pointer group/file">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-strong)] flex items-center justify-center text-[9px] font-bold text-cyan-400 group-hover/file:bg-cyan-400/10 transition-colors">IMG</div>
                  <div className="truncate text-sm font-semibold text-[var(--text-muted)] group-hover/file:text-[var(--text-primary)] transition-colors">Site_Photos.zip</div>
                </div>
              </div>
            </div>
        </div>

        {/* COLUMN 3: THE EXPERT HUB */}
        <div className="flex flex-col gap-6">
          
          {/* EXPERT PROFILE CARD */}
          <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] flex flex-col relative overflow-hidden shadow-lg h-[400px]">
            {/* SOS Panic Button */}
            <button className="absolute top-6 right-6 p-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[#ff5c5c]/10 hover:border-[#ff5c5c]/50 transition-all group/sos shadow-md" title="Trigger SOS Emergency Alert">
              <ShieldAlert size={20} className="text-[#ff5c5c]/70 group-hover/sos:text-[#ff5c5c] transition-colors" />
            </button>

            <h3 className="text-xs font-mono-sos mb-6 text-[var(--text-faint)] tracking-widest uppercase w-full text-left">Your Expert Hub</h3>
            
            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 rounded-full p-1 border border-[var(--border-strong)] relative shrink-0">
                <div className="w-full h-full rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center overflow-hidden">
                  <Star size={24} className="text-[var(--color-primary)] opacity-50" />
                </div>
                {/* Online Indicator */}
                <div className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-400 border-[3px] border-[var(--bg-base)] rounded-full"></div>
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-1 truncate">Dr. Sarah Jenkins</h2>
                <p className="text-xs font-inter text-[var(--color-primary)] font-semibold mb-2 truncate">Lead Architectural Consultant</p>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono-sos mt-1">
                  <MapPin size={10} className="text-[var(--text-faint)] shrink-0" /> <span className="truncate">New York (EST)</span>
                </div>
              </div>
            </div>

            {/* Centralized Booking */}
            <button onClick={() => setIsBooking(true)} className="w-full btn-sos-filled py-4 text-sm tracking-widest rounded-2xl shadow-[0_10px_20px_rgba(var(--color-primary-rgb),0.2)] mb-auto">
              Book New Session
            </button>
            
            {/* Sent Invitations / Requests */}
            <div className="mt-8">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-mono-sos text-[var(--text-faint)] uppercase tracking-widest">Pending</span>
                <span className="text-[var(--text-muted)] flex items-center gap-1"><MoreHorizontal size={12}/> 1</span>
              </div>
              <div className="bg-[var(--bg-surface-2)] rounded-2xl p-4 border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] flex items-center justify-between shadow-inner">
                 <span>Follow-up Call</span>
                 <span className="text-[9px] uppercase tracking-widest font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full border border-orange-400/20">Awaiting</span>
              </div>
            </div>
          </div>

          {/* INTEGRATED MESSAGING */}
          <div className="glass-panel p-6 rounded-[32px] border border-[var(--border-strong)] flex flex-col relative overflow-hidden shadow-lg flex-1">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-400 to-pink-600"></div>
            <div className="flex justify-between items-center mb-4 pl-2">
              <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase flex items-center gap-2"><MessageSquare size={12} className="text-pink-400"/> Recent Messages</h3>
              <Link href="/dashboard/client/chat" className="text-[10px] font-bold text-[var(--text-muted)] hover:text-pink-400 transition-colors uppercase tracking-widest flex items-center gap-1">Open Chat <ArrowRight size={10}/></Link>
            </div>
            <div className="pl-2 flex flex-col gap-3 h-full">
              <div className="bg-[var(--bg-surface-2)] border border-[var(--border-strong)] p-5 rounded-2xl rounded-tl-sm text-sm text-[var(--text-muted)] leading-relaxed relative shadow-inner flex-1 flex items-center">
                <p>Please upload the latest blueprints to the vault before our next session so I can review the changes.</p>
                <span className="absolute -bottom-4 left-2 text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest">TODAY • 10:42 AM</span>
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
              className="glass-panel p-10 max-w-lg w-full relative border-organic shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
            >
              <button 
                onClick={() => setIsBooking(false)}
                className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-display text-4xl font-bold mb-4 text-embossed">Book a Session</h2>
              <p className="text-lg text-[var(--text-muted)] mb-10">Select a date and time to meet with your expert.</p>
              
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
                    <option>Dr. Sarah Jenkins</option>
                    <option>Michael Chen</option>
                    <option>Elena Rodriguez</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">DATE & TIME</label>
                  <div className="flex gap-4">
                    <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="flex-1 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] [color-scheme:dark] transition-colors shadow-inner" />
                    
                    {/* CUSTOM CLOCK TRIGGER */}
                    <div className="flex-1 relative">
                      <button 
                        onClick={() => setShowTimePicker(!showTimePicker)}
                        className="w-full h-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg text-left outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner flex items-center justify-between"
                      >
                        {selectedTime}
                        <Clock size={20} className="text-[var(--color-primary)] opacity-80" />
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
                className="btn-sos-filled w-full py-5 text-lg text-center justify-center rounded-2xl tracking-widest mt-8"
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
