"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  CalendarDays, 
  FolderLock, 
  MessageSquare, 
  Video, 
  LogOut,
  CircleUserRound,
  Settings,
  Moon,
  X,
  UserCircle2,
  Image as ImageIcon,
  Globe2,
  Smartphone,
  Banknote
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currency, setCurrency] = useState("INR");
  
  // Determine base path for the role (mocking based on URL for now)
  const role = pathname.includes("/expert") ? "expert" : pathname.includes("/admin") ? "admin" : "client";
  const basePath = `/dashboard/${role}`;

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, path: `${basePath}`, colorClass: "text-cyan-400 group-hover/nav:text-cyan-400" },
    { name: "Sessions", icon: CalendarDays, path: `${basePath}/sessions`, colorClass: "text-orange-400 group-hover/nav:text-orange-400" },
    { name: "Vault", icon: FolderLock, path: `${basePath}/vault`, colorClass: "text-emerald-400 group-hover/nav:text-emerald-400" },
    { name: "Messages", icon: MessageSquare, path: `${basePath}/chat`, colorClass: "text-pink-400 group-hover/nav:text-pink-400" },
    { name: "Video Call", icon: Video, path: `/dashboard/video-call`, colorClass: "text-purple-400 group-hover/nav:text-purple-400" },
  ];

  return (
    <div className="min-h-screen flex flex-col relative bg-transparent overflow-x-hidden">
      
      {/* 1. THE GOLD STANDARD TOP HEADER */}
      <header className="w-full h-20 z-[90] glass-panel border-b border-[var(--border-strong)] flex items-center justify-between px-8 shrink-0 relative">
        <div className="flex items-center gap-4 w-[100px]">
        </div>

        {/* Empty space to balance the header flexbox if needed, or just let it be empty */}
        <div className="hidden md:flex items-center gap-8">
        </div>

        <div className="w-[100px]"></div>
      </header>

      {/* 2. THE HORIZONTAL MAGNETIC ISLAND */}
      <aside className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] glass-panel border border-[var(--border-strong)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[32px] flex flex-row items-center justify-center px-6 w-max max-w-[95vw] group hover:h-[96px] h-[60px] scale-[0.70] hover:scale-100 origin-bottom transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bottom-8 hover:px-8 hover:rounded-[40px] hover:shadow-[0_40px_80px_rgba(0,0,0,0.6)]">

        {/* NAVIGATION LINKS */}
        <nav className="flex flex-row items-center justify-center gap-1 md:gap-3 w-full h-full overflow-hidden">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.path}
              className={`group/nav flex flex-col items-center justify-center gap-1.5 w-[72px] sm:w-[84px] py-2 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.12] font-inter text-xs tracking-wide font-semibold whitespace-nowrap h-full relative ${
                pathname === item.path 
                  ? "text-[var(--text-primary)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {/* Active Indicator */}
              {pathname === item.path && (
                <motion.div layoutId="active-nav-indicator" className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
              )}
              <item.icon size={20} className={`shrink-0 transition-colors duration-300 z-10 ${pathname === item.path ? item.colorClass.split(" ")[0] : `text-[var(--text-muted)] ${item.colorClass}`}`} />
              <div className="absolute top-[56%] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] translate-y-3 group-hover:translate-y-0 flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-[0.18em] font-bold mt-1">{item.name}</span>
              </div>
            </Link>
          ))}
          
          <div className="w-px h-6 bg-[var(--border-strong)] mx-1"></div>

          {/* ACCOUNT DROPDOWN */}
          <div className="relative group/account h-full flex flex-col justify-center items-center w-[72px] sm:w-[84px]">
            <div className="cursor-pointer flex flex-col items-center justify-center gap-1.5 w-full py-2 rounded-2xl border border-transparent transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.12] h-full relative">
              <CircleUserRound size={24} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover/account:text-[var(--color-primary)] transition-colors duration-300 z-10" />
              <div className="absolute top-[56%] opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-3 group-hover:translate-y-0 flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-[0.18em] font-bold mt-1 text-[var(--color-primary)]">{role}</span>
              </div>
            </div>

            {/* Dropdown Menu (Popout Up) */}
            <div className="absolute bottom-[115%] right-1/2 translate-x-1/2 w-72 p-4 rounded-[32px] glass-panel opacity-0 pointer-events-none group-hover/account:opacity-100 group-hover/account:pointer-events-auto transition-all duration-500 translate-y-4 group-hover/account:translate-y-0 flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-[var(--border-strong)] z-[110] backdrop-blur-3xl">
              <div className="px-4 py-4 border-b border-[var(--border)] mb-3 text-center">
                <p className="text-lg font-bold text-[var(--text-primary)] capitalize font-display tracking-wide">{role} Profile</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <p className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-mono-sos">Online & Authenticated</p>
                </div>
              </div>
              
              <button onClick={() => setIsProfileOpen(true)} className="w-full px-5 py-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-2xl transition-all flex items-center justify-between font-inter font-bold tracking-wider group">
                <Settings size={18} className="text-[var(--text-faint)] group-hover:text-cyan-400 transition-colors" />
                Preferences
              </button>
              <button className="w-full px-5 py-4 mt-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-2xl transition-all flex items-center justify-between font-inter font-bold tracking-wider group">
                <Moon size={18} className="text-[var(--text-faint)] group-hover:text-purple-400 transition-colors" />
                Toggle Theme
              </button>
              
              <div className="w-full h-px bg-[var(--border)] my-3"></div>
              
              <Link href="/login" className="px-5 py-4 text-sm text-[#ff5c5c] hover:bg-[rgba(255,92,92,0.1)] rounded-2xl transition-all flex items-center justify-between font-inter font-bold border border-transparent hover:border-[rgba(255,92,92,0.2)] tracking-wider group">
                <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
                Secure Sign Out
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area - Reverted to older padding style but with 50px left/right */}
      <main className="flex-1 w-full pl-[50px] pr-[50px] pt-6 pb-32 relative transition-all duration-500 min-w-0 z-10">
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
              className="glass-panel p-10 max-w-2xl w-full relative border-organic shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
              >
                <X size={24} />
              </button>
              
              <h2 className="font-display text-4xl font-bold mb-2 text-embossed">Profile Preferences</h2>
              <p className="text-sm text-[var(--text-muted)] mb-10 font-mono-sos uppercase tracking-widest">Customize your SOS experience</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Col: Identity */}
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><UserCircle2 size={14} className="text-cyan-400"/> DISPLAY NAME</label>
                    <input type="text" defaultValue="Client" className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner font-bold" />
                  </div>

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><ImageIcon size={14} className="text-pink-400"/> AVATAR SELECTION</label>
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
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Banknote size={14} className="text-emerald-400"/> DEFAULT CURRENCY</label>
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

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Globe2 size={14} className="text-cyan-400"/> GLOBAL TIMEZONE</label>
                    <select className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer font-bold">
                      <option>Indian Standard Time (IST)</option>
                      <option>Eastern Standard Time (EST)</option>
                      <option>Pacific Standard Time (PST)</option>
                      <option>Greenwich Mean Time (GMT)</option>
                    </select>
                    <p className="text-[10px] text-[var(--text-faint)] mt-2 italic">*Experts can adjust their individual availability blocks from their own login.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Moon size={14} className="text-purple-400"/> INTERFACE THEME</label>
                    <div className="flex bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl p-1 shadow-inner">
                      <button className="flex-1 py-3 text-sm font-bold text-white bg-[var(--bg-surface-2)] rounded-xl shadow-md border border-[var(--border)]">Dark</button>
                      <button className="flex-1 py-3 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors">Light</button>
                      <button className="flex-1 py-3 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors">System</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Smartphone size={14} className="text-orange-400"/> NOTIFICATION ROUTING</label>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl cursor-pointer hover:border-[var(--border-strong)] transition-colors shadow-inner">
                        <span className="text-sm font-bold text-[var(--text-primary)]">Email Receipts</span>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-[var(--color-primary)]" />
                      </label>
                      <label className="flex items-center justify-between p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl cursor-pointer hover:border-[var(--border-strong)] transition-colors shadow-inner">
                        <span className="text-sm font-bold text-[var(--text-primary)]">SMS Urgent Alerts</span>
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
