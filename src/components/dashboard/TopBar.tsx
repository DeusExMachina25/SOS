"use client";

import React from "react";
import { Search, Bell, Moon, Sun } from "lucide-react";

interface TopBarProps {
  /** Breadcrumb tail — the current page name */
  pageName: string;
  role: string;
  theme: string;
  onToggleTheme: () => void;
  onOpenProfile: () => void;
  /** Right-hand call to action, e.g. "Book a session" */
  action?: React.ReactNode;
  notifications?: number;
}

export default function TopBar({
  pageName,
  role,
  theme,
  onToggleTheme,
  onOpenProfile,
  action,
  notifications = 0
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface)] px-5 lg:px-7 h-[72px] shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono-sos text-[10px] tracking-[0.2em] min-w-0">
        <span className="text-[var(--text-faint)] capitalize hidden sm:inline">{role}</span>
        <span className="text-[var(--color-primary)] hidden sm:inline">/</span>
        <span className="text-[var(--text-primary)] truncate">{pageName}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <label className="hidden md:flex items-center gap-2 border border-[var(--border)] bg-[var(--bg-base)] px-3 h-9 w-[200px] xl:w-[260px] focus-within:border-[var(--border-strong)] transition-colors">
          <Search size={13} className="text-[var(--text-faint)] shrink-0" strokeWidth={1.75} />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search the dashboard"
            className="w-full bg-transparent font-inter text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none"
          />
        </label>

        {/* Notifications */}
        <button
          type="button"
          aria-label={`Notifications${notifications ? `, ${notifications} unread` : ""}`}
          className="relative flex h-9 w-9 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <Bell size={14} strokeWidth={1.75} />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center bg-[var(--color-orange)] px-1 font-mono-sos text-[8px] text-[var(--bg-base)] tabular-nums">
              {notifications}
            </span>
          )}
        </button>

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
