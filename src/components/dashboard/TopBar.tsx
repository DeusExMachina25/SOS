"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import DashboardSearch from "./DashboardSearch";
import NotificationBell from "./NotificationBell";
import type { UnreadThread } from "@/lib/data/unread";

interface TopBarProps {
  /** The big heading: "Welcome back, Priya" on Overview, the page name elsewhere */
  title: string;
  /** Small line above the heading: the greeting and time, or the role */
  eyebrow?: string;
  role: string;
  theme: string;
  onToggleTheme: () => void;
  onOpenProfile: () => void;
  /** Right-hand call to action, e.g. "Book a session" */
  action?: React.ReactNode;
  /** Pages the search box can jump to. */
  searchPages: { name: string; href: string }[];
  /** Conversations with unread messages, for the bell. */
  unreadThreads?: UnreadThread[];
}

/**
 * The dashboard header, laid out like the reference: a large editorial
 * heading on the left, search, bell, theme and account on the right.
 * It sits on the page itself rather than in a bar, so there is no border.
 */
export default function TopBar({
  title,
  eyebrow,
  role,
  theme,
  onToggleTheme,
  onOpenProfile,
  action,
  searchPages,
  unreadThreads = [],
}: TopBarProps) {
  const dashboardRole = role === "expert" ? "expert" : "client";
  return (
    <header className="flex items-center justify-between gap-4 px-5 lg:px-8 pt-6 pb-4 lg:pt-8 shrink-0">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)] truncate">{eyebrow}</p>
        )}
        <h1 className="mt-1.5 font-editorial text-[28px] sm:text-[40px] lg:text-[46px] leading-[1.05] tracking-tight text-[var(--text-primary)] break-words">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search and the bell read the signed-in user's own sessions and
            payments; for an admin that would be the whole platform, so the
            admin console has its own pages instead. */}
        {role !== "admin" && <DashboardSearch role={dashboardRole} pages={searchPages} />}

        {role !== "admin" && <NotificationBell role={dashboardRole} unreadThreads={unreadThreads} />}

        {/* Theme */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="flex h-10 w-10 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          {theme === "dark" ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
        </button>

        {/* Account */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Open account settings"
          className="flex h-10 w-10 items-center justify-center border border-[var(--border)] overflow-hidden transition-colors hover:border-[var(--color-primary)]"
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
