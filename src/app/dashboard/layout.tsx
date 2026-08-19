"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  FolderLock,
  MessageSquare,
  Video,
  LogOut,
  CircleUserRound,
  Settings,
  Moon,
  Sun,
  X,
  UserCircle2,
  Image as ImageIcon,
  Globe2,
  Smartphone,
  Banknote,
  Database,
  ShieldCheck,
  Wifi,
  Check
} from "lucide-react";
import { getMyExpertProfile, setMyUpiId } from "@/lib/data/queries";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [theme, setTheme] = useState("dark");
  const [upiId, setUpiId] = useState("");
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiSaved, setUpiSaved] = useState(false);
  const [upiError, setUpiError] = useState("");

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  // Determine base path for the role
  const role = pathname.includes("/expert") ? "expert" : pathname.includes("/admin") ? "admin" : "client";
  const basePath = `/dashboard/${role}`;

  // Load the expert's payout UPI ID when they open Preferences.
  useEffect(() => {
    if (!isProfileOpen || role !== "expert") return;
    getMyExpertProfile()
      .then((profile) => setUpiId(profile?.upiId ?? ""))
      .catch((err) => console.error(err));
  }, [isProfileOpen, role]);

  const handleSaveUpi = async () => {
    setUpiError("");
    setUpiSaving(true);
    try {
      await setMyUpiId(upiId.trim());
      setUpiSaved(true);
      setTimeout(() => setUpiSaved(false), 2000);
    } catch (err) {
      setUpiError(err instanceof Error ? err.message : "Failed to save UPI ID");
    } finally {
      setUpiSaving(false);
    }
  };

  // Breadcrumbs title calculations
  const pageName = pathname.endsWith("/vault")
    ? "Vault"
    : pathname.endsWith("/chat")
    ? "Messages"
    : pathname.endsWith("/sessions")
    ? "Sessions"
    : pathname.endsWith("/availability")
    ? "Availability"
    : pathname.includes("/video-call")
    ? "Video Call"
    : "Overview";

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, path: `${basePath}`, colorClass: "text-[var(--color-primary)] group-hover/nav:text-[var(--color-primary)]" },
    { name: "Sessions", icon: CalendarDays, path: `${basePath}/sessions`, colorClass: "text-[var(--color-orange)] group-hover/nav:text-[var(--color-orange)]" },
    ...(role === "expert"
      ? [{ name: "Availability", icon: CalendarClock, path: `${basePath}/availability`, colorClass: "text-[var(--color-primary)] group-hover/nav:text-[var(--color-primary)]" }]
      : []),
    { name: "Vault", icon: FolderLock, path: `${basePath}/vault`, colorClass: "text-[var(--color-green)] group-hover/nav:text-[var(--color-green)]" },
    { name: "Messages", icon: MessageSquare, path: `${basePath}/chat`, colorClass: "text-[var(--color-orange)] group-hover/nav:text-[var(--color-orange)]" },
    { name: "Video Call", icon: Video, path: `/dashboard/video-call`, colorClass: "text-[var(--color-primary)] group-hover/nav:text-[var(--color-primary)]" },
  ];

  return (
    <div className="min-h-screen flex flex-col relative bg-transparent overflow-x-hidden">
      
      {/* 1. THE GOLD STANDARD TOP HEADER */}
      <header className="w-full h-20 z-[90] glass-panel border-b border-[var(--border-strong)] flex items-center justify-between px-8 shrink-0 relative backdrop-blur-xl">
        {/* BREADCRUMBS */}
        <div className="flex items-center gap-2 text-xs font-mono-sos text-[var(--text-muted)] tracking-wider">
          <span className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer">SOS</span>
          <span className="text-[var(--color-primary)]">/</span>
          <span className="capitalize opacity-60">{role}</span>
          <span className="text-[var(--color-primary)]">/</span>
          <span className="text-[var(--text-primary)] font-bold">{pageName}</span>
        </div>

        {/* LIVE SYSTEM STATUS COCKPIT */}
        <div className="hidden lg:flex items-center gap-6 bg-[var(--bg-base)] px-5 py-2.5 rounded-full border border-[var(--border)] shadow-inner">
          <div className="flex items-center gap-2 text-[10px] font-mono-sos font-bold text-[var(--text-muted)]">
            <Database size={12} className="text-[var(--color-green)]" />
            <span>DB SYNC</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] animate-pulse"></span>
          </div>
          <div className="h-3 w-px bg-[var(--border-strong)]"></div>
          <div className="flex items-center gap-2 text-[10px] font-mono-sos font-bold text-[var(--text-muted)]">
            <ShieldCheck size={12} className="text-[var(--color-primary)]" />
            <span>AES-256</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"></span>
          </div>
          <div className="h-3 w-px bg-[var(--border-strong)]"></div>
          <div className="flex items-center gap-2 text-[10px] font-mono-sos font-bold text-[var(--text-muted)]">
            <Wifi size={12} className="text-[var(--color-green)]" />
            <span>LIVEKIT AUDIO</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] animate-pulse"></span>
          </div>
        </div>

        {/* PROFILE BADGE & STATUS */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[var(--text-primary)] capitalize">{role} Account</p>
            <p className="text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">Safe Connect</p>
          </div>
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-strong)] flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-[var(--color-primary)] transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=SOS_${role}&backgroundColor=transparent`} alt="Profile" className="w-full h-full p-1 opacity-80" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-[var(--color-green)] rounded-full border border-[var(--bg-base)]"></div>
          </div>
        </div>
      </header>

      {/* 2. THE HORIZONTAL MAGNETIC ISLAND */}
      <aside className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] glass-panel border border-[var(--border-strong)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[24px] flex flex-row items-center justify-center px-6 w-max max-w-[95vw] group transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bottom-8 hover:px-8 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl h-[68px]">

        {/* NAVIGATION LINKS */}
        <nav className="flex flex-row items-center justify-center gap-1 md:gap-3 w-full h-full">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.path}
              className={`group/nav flex flex-col items-center justify-center gap-1 w-[72px] sm:w-[84px] py-1.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.08] font-inter text-xs tracking-wide font-semibold whitespace-nowrap h-full relative ${
                pathname === item.path 
                  ? "text-[var(--text-primary)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {/* Active Indicator */}
              {pathname === item.path && (
                <motion.div layoutId="active-nav-indicator" className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
              )}
              <item.icon size={20} className={`shrink-0 transition-colors duration-300 z-10 ${pathname === item.path ? item.colorClass.split(" ")[0] : `text-[var(--text-muted)] ${item.colorClass}`}`} />
              <div className="absolute top-[60%] opacity-0 group-hover/nav:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] translate-y-2 group-hover/nav:translate-y-0 flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.18em] font-bold mt-1">{item.name}</span>
              </div>
            </Link>
          ))}
          
          <div className="w-px h-6 bg-[var(--border-strong)] mx-1"></div>

          {/* ACCOUNT DROPDOWN */}
          <div className="relative group/account h-full flex flex-col justify-center items-center w-[72px] sm:w-[84px]">
            <div className="cursor-pointer flex flex-col items-center justify-center gap-1 w-full py-1.5 rounded-2xl border border-transparent transition-all duration-300 hover:-translate-y-1 hover:scale-[1.08] h-full relative">
              <CircleUserRound size={22} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover/account:text-[var(--color-primary)] transition-colors duration-300 z-10" />
              <div className="absolute top-[60%] opacity-0 group-hover/account:opacity-100 transition-all duration-500 translate-y-2 group-hover/account:translate-y-0 flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.18em] font-bold mt-1 text-[var(--color-primary)]">{role}</span>
              </div>
            </div>

            {/* Dropdown Menu (Popout Up) */}
            <div className="absolute bottom-[115%] right-1/2 translate-x-1/2 w-72 p-4 rounded-[24px] glass-panel opacity-0 pointer-events-none group-hover/account:opacity-100 group-hover/account:pointer-events-auto transition-all duration-300 translate-y-4 group-hover/account:translate-y-0 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-[var(--border-strong)] z-[110] backdrop-blur-3xl">
              <div className="px-4 py-3 border-b border-[var(--border)] mb-2 text-center">
                <p className="text-sm font-bold text-[var(--text-primary)] capitalize font-display tracking-wide">{role} Profile</p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] shadow-[0_0_8px_rgba(184,207,79,0.8)] animate-pulse"></div>
                  <p className="text-[8px] text-[var(--text-muted)] tracking-widest uppercase font-mono-sos">Online & Secure</p>
                </div>
              </div>
              
              <button onClick={() => setIsProfileOpen(true)} className="w-full px-4 py-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-xl transition-all flex items-center justify-between font-inter font-bold tracking-wider group">
                <Settings size={16} className="text-[var(--text-faint)] group-hover:text-[var(--color-primary)] transition-colors" />
                Preferences
              </button>
              <button onClick={toggleTheme} className="w-full px-4 py-3 mt-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-xl transition-all flex items-center justify-between font-inter font-bold tracking-wider group">
                {theme === "dark" ? (
                  <>
                    <Sun size={16} className="text-[var(--text-faint)] group-hover:text-[var(--color-primary)] transition-colors" />
                    Switch to Light
                  </>
                ) : (
                  <>
                    <Moon size={16} className="text-[var(--text-faint)] group-hover:text-[var(--color-primary)] transition-colors" />
                    Switch to Dark
                  </>
                )}
              </button>
              
              <div className="w-full h-px bg-[var(--border)] my-2"></div>
              
              <Link href="/login" className="px-4 py-3 text-xs text-[var(--color-orange)] hover:bg-[rgba(255,91,46,0.1)] rounded-xl transition-all flex items-center justify-between font-inter font-bold border border-transparent hover:border-[rgba(255,91,46,0.2)] tracking-wider group">
                <LogOut size={16} className="transition-transform group-hover:-translate-x-0.5" />
                Secure Sign Out
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full pl-[50px] pr-[50px] pt-6 pb-32 xl:pb-24 relative transition-all duration-500 min-w-0 z-10 xl:h-[calc(100vh-80px)] xl:overflow-hidden flex flex-col">
        {children}
      </main>

      {/* PROFILE PREFERENCES MODAL */}
      <AnimatePresence>
        {isProfileOpen && (
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
              className="glass-panel p-10 max-w-2xl w-full relative border-organic shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh] backdrop-blur-2xl"
            >
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-display text-4xl font-bold mb-2 text-embossed">Profile Preferences</h2>
              <p className="text-xs text-[var(--text-muted)] mb-10 font-mono-sos uppercase tracking-widest">Customize your SOS experience</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Col: Identity */}
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><UserCircle2 size={14} className="text-[var(--color-primary)]"/> DISPLAY NAME</label>
                    <input type="text" defaultValue="Client" className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner font-bold" />
                  </div>

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><ImageIcon size={14} className="text-[var(--color-orange)]"/> AVATAR SELECTION</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className={`aspect-square rounded-2xl border-2 cursor-pointer transition-all ${i === 1 ? 'border-[var(--color-primary)] shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] bg-[var(--color-primary)]/10' : 'border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--bg-base)]'} flex items-center justify-center overflow-hidden`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=SOS${i}&backgroundColor=transparent`} alt={`Avatar ${i}`} className="w-full h-full opacity-80 hover:opacity-100 p-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Col: Settings */}
                <div className="space-y-8">
                  
                  {/* Currency Selection */}
                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Banknote size={14} className="text-[var(--color-green)]"/> DEFAULT CURRENCY</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer font-bold"
                    >
                      <option value="INR">₹ INR (Indian Rupee)</option>
                      <option value="USD">$ USD (US Dollar)</option>
                      <option value="EUR">€ EUR (Euro)</option>
                    </select>
                  </div>

                  {role === "expert" && (
                    <div>
                      <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Smartphone size={14} className="text-[var(--color-green)]"/> PAYOUT UPI ID</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => { setUpiId(e.target.value); setUpiError(""); }}
                          placeholder="yourname@upi"
                          className="flex-1 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner font-bold"
                        />
                        <button
                          onClick={handleSaveUpi}
                          disabled={upiSaving}
                          className="px-6 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--color-green)] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {upiSaved ? <Check size={14} className="text-[var(--color-green)]" /> : upiSaving ? "..." : "Save"}
                        </button>
                      </div>
                      {upiError && <p className="text-[10px] text-[var(--color-orange)] mt-2">{upiError}</p>}
                      <p className="text-[10px] text-[var(--text-faint)] mt-2 italic">*Clients see this ID when paying you directly via UPI.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Globe2 size={14} className="text-[var(--color-primary)]"/> GLOBAL TIMEZONE</label>
                    <select className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer font-bold">
                      <option>Indian Standard Time (IST)</option>
                      <option>Eastern Standard Time (EST)</option>
                      <option>Pacific Standard Time (PST)</option>
                      <option>Greenwich Mean Time (GMT)</option>
                    </select>
                    <p className="text-[10px] text-[var(--text-faint)] mt-2 italic">*Experts can adjust their availability from their profile settings.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Moon size={14} className="text-[var(--color-primary)]"/> INTERFACE THEME</label>
                    <div className="flex bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl p-1 shadow-inner">
                      <button onClick={() => { setTheme("dark"); document.documentElement.setAttribute("data-theme", "dark"); localStorage.setItem("theme", "dark"); }} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${theme === "dark" ? "text-white bg-[var(--bg-surface-2)] shadow-md border border-[var(--border)]" : "text-[var(--text-muted)]"}`}>Dark</button>
                      <button onClick={() => { setTheme("light"); document.documentElement.setAttribute("data-theme", "light"); localStorage.setItem("theme", "light"); }} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${theme === "light" ? "text-primary bg-[var(--bg-surface-2)] shadow-md border border-[var(--border)]" : "text-[var(--text-muted)]"}`}>Light</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Smartphone size={14} className="text-[var(--color-orange)]"/> NOTIFICATION ROUTING</label>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl cursor-pointer hover:border-[var(--border-strong)] transition-colors shadow-inner">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Email Receipts</span>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-[var(--color-primary)]" />
                      </label>
                      <label className="flex items-center justify-between p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl cursor-pointer hover:border-[var(--border-strong)] transition-colors shadow-inner">
                        <span className="text-xs font-bold text-[var(--text-primary)]">SMS Urgent Alerts</span>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-[var(--color-primary)]" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsProfileOpen(false)}
                className="btn-sos-filled w-full py-5 text-lg text-center justify-center rounded-2xl tracking-widest mt-10 shadow-[0_10px_30px_rgba(var(--color-primary-rgb),0.3)]"
              >
                Save Preferences
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
