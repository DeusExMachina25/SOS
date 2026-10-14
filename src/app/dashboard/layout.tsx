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
  Settings,
  Moon,
  X,
  UserCircle2,
  Globe2,
  Smartphone,
  Check,
  ShieldCheck,
  Wallet,
  Receipt
} from "lucide-react";
import { getMyExpertProfile, getMyProfile, setMyUpiId, setMyTimezone, setMyDisplayName } from "@/lib/data/queries";
import { COMMON_TIME_ZONES, describeTimeZone, resolveTimeZone, viewerTimeZone } from "@/lib/data/slots";
import Sidebar, { type NavGroup } from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [displayName, setDisplayName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiSaved, setUpiSaved] = useState(false);
  const [upiError, setUpiError] = useState("");
  // The expert's stored timezone ("" until loaded), what their availability and bookings are read in.
  const [expertZone, setExpertZone] = useState("");
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneSaved, setZoneSaved] = useState(false);
  const [zoneError, setZoneError] = useState("");

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("sos-theme") || localStorage.getItem("theme") || "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // The signed-in user's name, for the sidebar and the Preferences field.
  useEffect(() => {
    getMyProfile()
      .then((profile) => setDisplayName(profile?.fullName ?? ""))
      .catch((err) => console.error("Failed to load profile", err));
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the draft each time the panel opens
    setNameInput(displayName);
    setNameError("");
  }, [isProfileOpen, displayName]);

  useEffect(() => {
    if (!isProfileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProfileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isProfileOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("sos-theme", nextTheme);
  };

  // Determine base path for the role
  const role = pathname.includes("/expert") ? "expert" : pathname.includes("/admin") ? "admin" : "client";
  const basePath = `/dashboard/${role}`;

  // Load the expert's payout UPI ID when they open Preferences.
  useEffect(() => {
    if (!isProfileOpen || role !== "expert") return;
    getMyExpertProfile()
      .then((profile) => {
        setUpiId(profile?.upiId ?? "");
        setExpertZone(resolveTimeZone(profile?.timezone));
      })
      .catch((err) => console.error(err));
  }, [isProfileOpen, role]);

  const handleSaveName = async () => {
    setNameError("");
    setNameSaving(true);
    try {
      const saved = await setMyDisplayName(nameInput);
      setDisplayName(saved);
      setNameInput(saved);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to save name");
    } finally {
      setNameSaving(false);
    }
  };

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

  const handleZoneChange = async (next: string) => {
    const previous = expertZone;
    setExpertZone(next);
    setZoneError("");
    setZoneSaved(false);
    setZoneSaving(true);
    try {
      await setMyTimezone(next);
      setZoneSaved(true);
      setTimeout(() => setZoneSaved(false), 2000);
    } catch (err) {
      setExpertZone(previous);
      setZoneError(err instanceof Error ? err.message : "Failed to save timezone");
    } finally {
      setZoneSaving(false);
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
    : pathname.endsWith("/experts")
    ? "Experts"
    : pathname.endsWith("/payouts")
    ? "Payouts"
    : pathname.includes("/video-call")
    ? "Video Call"
    : "Overview";

  /* Grouped like a console rail: the work you do daily, the live room,
     then the account. Mirrors the sidebar grammar of the reference. */
  const adminNav: NavGroup[] = [
    {
      label: "Admin",
      items: [
        { name: "Overview", icon: LayoutDashboard, path: basePath },
        { name: "Experts", icon: ShieldCheck, path: `${basePath}/experts` },
        { name: "Payouts", icon: Wallet, path: `${basePath}/payouts` },
        { name: "Sessions", icon: Receipt, path: `${basePath}/sessions` },
      ],
    },
    {
      label: "Account",
      items: [{ name: "Settings", icon: Settings, path: basePath, onSelect: () => setIsProfileOpen(true) }],
    },
  ];

  const navGroups: NavGroup[] = role === "admin" ? adminNav : [
    {
      label: "Main",
      items: [
        { name: "Overview", icon: LayoutDashboard, path: `${basePath}` },
        { name: "Sessions", icon: CalendarDays, path: `${basePath}/sessions` },
        ...(role === "expert"
          ? [{ name: "Availability", icon: CalendarClock, path: `${basePath}/availability` }]
          : []),
      ],
    },
    {
      label: "Workspace",
      items: [
        { name: "Vault", icon: FolderLock, path: `${basePath}/vault` },
        { name: "Messages", icon: MessageSquare, path: `${basePath}/chat` },
        { name: "Video Call", icon: Video, path: `/dashboard/video-call` },
      ],
    },
    {
      label: "Account",
      items: [
        { name: "Settings", icon: Settings, path: `${basePath}`, onSelect: () => setIsProfileOpen(true) },
      ],
    },
  ];

  /* h-[100dvh], not min-h-screen: <main> below needs a definite height for its
     own overflow-y-auto to scroll and for h-full children to resolve. */
  return (
    <div className="h-[100dvh] overflow-hidden flex relative bg-transparent">

      <Sidebar
        groups={navGroups}
        role={role}
        footer={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 border border-[var(--border-strong)] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.dicebear.com/7.x/shapes/svg?seed=SOS_${role}&backgroundColor=transparent`}
                alt=""
                className="h-full w-full p-1 opacity-80"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-inter text-[12px] text-[var(--text-primary)] truncate">
                {displayName || `${role.charAt(0).toUpperCase()}${role.slice(1)} account`}
              </p>
              <p className="font-mono-sos text-[8px] tracking-[0.2em] text-[var(--text-faint)]">
                Online &amp; secure
              </p>
            </div>
            <Link
              href="/login"
              aria-label="Sign out"
              className="flex h-7 w-7 items-center justify-center border border-[var(--border)] text-[var(--text-faint)] transition-colors hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]"
            >
              <LogOut size={12} strokeWidth={1.75} />
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col min-w-0">
        <TopBar
          pageName={pageName}
          role={role}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenProfile={() => setIsProfileOpen(true)}
          searchPages={navGroups
            .flatMap((g) => g.items)
            .filter((item) => !item.onSelect)
            .map((item) => ({ name: item.name, href: item.path }))}
        />

        <main id="main" className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-7 pb-28 lg:pb-7">
          {children}
        </main>
      </div>

      {/* Mobile rail — the sidebar collapses below lg, so the same routes
          ride the bottom edge instead. */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-stretch border-t border-[var(--border-strong)] bg-[var(--bg-overlay)] backdrop-blur-xl">
        {navGroups.flatMap(g => g.items).filter(item => !item.onSelect).slice(0, 5).map(item => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors ${
                active ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              {active && <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-primary)]" />}
              <item.icon size={17} strokeWidth={1.75} />
              <span className="font-mono-sos text-[7px] tracking-[0.15em]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* PROFILE PREFERENCES MODAL — only controls that do something live here. */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[var(--bg-overlay)] backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Profile preferences"
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
                aria-label="Close"
                className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
              >
                <X size={24} />
              </button>

              <h2 className="font-display text-4xl font-bold mb-2 text-embossed">Profile Preferences</h2>
              <p className="text-xs text-[var(--text-muted)] mb-10 font-mono-sos uppercase tracking-widest">Changes save as you make them</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Col: who you are, how it looks */}
                <div className="space-y-8">
                  <div>
                    <label htmlFor="pref-name" className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2">
                      <UserCircle2 size={14} className="text-[var(--color-primary)]"/> DISPLAY NAME
                    </label>
                    <div className="flex gap-3">
                      <input
                        id="pref-name"
                        type="text"
                        value={nameInput}
                        maxLength={120}
                        autoComplete="name"
                        onChange={(e) => { setNameInput(e.target.value); setNameError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !nameSaving) handleSaveName(); }}
                        className="flex-1 min-w-0 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner font-bold"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={nameSaving || nameInput.trim() === displayName}
                        className="px-6 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--color-green)] transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {nameSaved ? <Check size={14} className="text-[var(--color-green)]" aria-label="Saved" /> : nameSaving ? "..." : "Save"}
                      </button>
                    </div>
                    {nameError && <p className="text-[10px] text-[var(--color-orange)] mt-2">{nameError}</p>}
                    <p className="text-[10px] text-[var(--text-faint)] mt-2 italic">*{role === "expert" ? "Clients see this on your profile and in messages." : "Your expert sees this on bookings and in messages."}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Moon size={14} className="text-[var(--color-primary)]"/> INTERFACE THEME</label>
                    <div className="flex bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl p-1 shadow-inner">
                      <button onClick={() => { setTheme("dark"); document.documentElement.setAttribute("data-theme", "dark"); localStorage.setItem("sos-theme", "dark"); }} aria-pressed={theme === "dark"} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${theme === "dark" ? "text-white bg-[var(--bg-surface-2)] shadow-md border border-[var(--border)]" : "text-[var(--text-muted)]"}`}>Dark</button>
                      <button onClick={() => { setTheme("light"); document.documentElement.setAttribute("data-theme", "light"); localStorage.setItem("sos-theme", "light"); }} aria-pressed={theme === "light"} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${theme === "light" ? "text-primary bg-[var(--bg-surface-2)] shadow-md border border-[var(--border)]" : "text-[var(--text-muted)]"}`}>Light</button>
                    </div>
                  </div>
                </div>

                {/* Right Col: money and time */}
                <div className="space-y-8">
                  {role === "expert" && (
                    <div>
                      <label htmlFor="pref-upi" className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2"><Smartphone size={14} className="text-[var(--color-green)]"/> PAYOUT UPI ID</label>
                      <div className="flex gap-3">
                        <input
                          id="pref-upi"
                          type="text"
                          value={upiId}
                          onChange={(e) => { setUpiId(e.target.value); setUpiError(""); }}
                          placeholder="yourname@upi"
                          className="flex-1 min-w-0 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner font-bold"
                        />
                        <button
                          onClick={handleSaveUpi}
                          disabled={upiSaving}
                          className="px-6 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--color-green)] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {upiSaved ? <Check size={14} className="text-[var(--color-green)]" aria-label="Saved" /> : upiSaving ? "..." : "Save"}
                        </button>
                      </div>
                      {upiError && <p className="text-[10px] text-[var(--color-orange)] mt-2">{upiError}</p>}
                      <p className="text-[10px] text-[var(--text-faint)] mt-2 italic">*Clients see this ID when paying you directly via UPI.</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="pref-timezone" className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest flex items-center gap-2">
                      <Globe2 size={14} className="text-[var(--color-primary)]"/> {role === "expert" ? "YOUR TIMEZONE" : "TIMEZONE"}
                      {zoneSaved && <Check size={14} className="text-[var(--color-green)]" aria-label="Saved" />}
                    </label>
                    {role === "expert" ? (
                      <>
                        <select
                          id="pref-timezone"
                          value={expertZone}
                          disabled={!expertZone || zoneSaving}
                          onChange={(e) => handleZoneChange(e.target.value)}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-sm outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer font-bold disabled:opacity-60"
                        >
                          {!expertZone && <option value="">Loading…</option>}
                          {[...new Set([...(expertZone ? [expertZone] : []), ...COMMON_TIME_ZONES])]
                            .sort((x, y) => (x === expertZone ? -1 : y === expertZone ? 1 : 0))
                            .map((zone) => (
                              <option key={zone} value={zone}>{describeTimeZone(zone)}</option>
                            ))}
                        </select>
                        {zoneError && <p className="text-[10px] text-[var(--color-orange)] mt-2">{zoneError}</p>}
                        <p className="text-[10px] text-[var(--text-faint)] mt-2 italic">*Your weekly availability and the dates clients pick are read in this timezone. Clients see your times converted to theirs.</p>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--text-primary)] font-bold px-1">
                        {describeTimeZone(viewerTimeZone())}
                        <span className="block text-[10px] text-[var(--text-faint)] mt-2 italic font-normal">*Taken from this device. Booking times are shown in your expert&apos;s timezone with your own time beside each one.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsProfileOpen(false)}
                className="btn-sos-filled w-full py-5 text-lg text-center justify-center rounded-2xl tracking-widest mt-10 shadow-[0_10px_30px_rgba(var(--color-primary-rgb),0.3)]"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
