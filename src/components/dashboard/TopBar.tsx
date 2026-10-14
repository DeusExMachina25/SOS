"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import DashboardSearch from "./DashboardSearch";
import NotificationBell from "./NotificationBell";

interface TopBarProps {
  /** Breadcrumb tail — the current page name */
  pageName: string;
  role: string;
  theme: string;
  onToggleTheme: () => void;
  onOpenProfile: () => void;
  /** Right-hand call to action, e.g. "Book a session" */
  action?: React.ReactNode;
  /** Pages the search box can jump to. */
  searchPages: { name: string; href: string }[];
}

export default function TopBar({
  pageName,
  role,
  theme,
  onToggleTheme,
  onOpenProfile,
  action,
  searchPages,
}: TopBarProps) {
  const dashboardRole = role === "expert" ? "expert" : "client";
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface)] px-5 lg:px-7 h-[72px] shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono-sos text-[10px] tracking-[0.2em] min-w-0">
        <span className="text-[var(--text-faint)] capitalize hidden sm:inline">{role}</span>
        <span className="text-[var(--color-primary)] hidden sm:inline">/</span>
        <span className="text-[var(--text-primary)] truncate">{pageName}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search and the bell read the signed-in user's own sessions and
            payments; for an admin that would be the whole platform, so the
            admin console has its own pages instead. */}
        {role !== "admin" && <DashboardSearch role={dashboardRole} pages={searchPages} />}

        {role !== "admin" && <NotificationBell role={dashboardRole} />}

        {/* Theme */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="flex h-9 w-9 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          {theme === "dark" ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
        </button>

        {/* Account */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Open account settings"
          className="flex h-9 w-9 items-center justify-center border border-[var(--border)] overflow-hidden transition-colors hover:border-[var(--color-primary)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.dicebear.com/7.x/shapes/svg?seed=SOS_${role}&backgroundColor=transparent`}
            alt=""
            className="h-full w-full p-1 opacity-80"
          />
        </button>

        {action}
      </div>
    </header>
  );
}
