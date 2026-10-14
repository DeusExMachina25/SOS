"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import SosMark from "../shared/SosMark";

export interface NavItem {
  name: string;
  icon: LucideIcon;
  path: string;
  /** When set, the item runs this instead of navigating (e.g. open the Preferences panel). */
  onSelect?: () => void;
  /** Unread/pending count rendered as a pill on the right */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  groups: NavGroup[];
  role: string;
  /** Rendered at the foot of the rail — the account card */
  footer?: React.ReactNode;
}

export default function Sidebar({ groups, role, footer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
      {/* Brand block */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 h-[72px] shrink-0">
        <Link href="/" className="flex items-center" aria-label="SOS home">
          <SosMark className="text-[17px]" label={null} />
        </Link>
        <span className="h-6 w-px bg-[var(--border-strong)]" />
        <span className="font-mono-sos text-[9px] tracking-[0.25em] text-[var(--text-faint)] capitalize">
          {role}
        </span>
      </div>

      {/* Grouped navigation */}
      <nav className="flex-1 overflow-y-auto py-6">
        {groups.map(group => (
          <div key={group.label} className="mb-7 last:mb-0">
            <p className="px-5 mb-3 font-mono-sos text-[9px] tracking-[0.3em] text-[var(--text-faint)]">
              {group.label}
            </p>

            <ul>
              {group.items.map(item => {
                const active = !item.onSelect && pathname === item.path;
                const className = `relative flex w-full items-center gap-3 px-5 py-2.5 text-left font-inter text-[13px] transition-colors duration-200 ${
                  active
                    ? "text-[var(--text-primary)] bg-[var(--bg-surface-2)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                }`;
                const content = (
                  <>
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--color-primary)]" />
                    )}
                    <item.icon
                      size={15}
                      strokeWidth={1.75}
                      className={active ? "text-[var(--color-primary)]" : "text-[var(--text-faint)]"}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="font-mono-sos text-[9px] px-1.5 py-0.5 bg-[var(--color-orange)] text-[var(--bg-base)] tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </>
                );
                return (
                  <li key={item.name}>
                    {item.onSelect ? (
                      <button type="button" onClick={item.onSelect} className={className}>
                        {content}
                      </button>
                    ) : (
                      <Link href={item.path} aria-current={active ? "page" : undefined} className={className}>
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && <div className="border-t border-[var(--border)] p-4 shrink-0">{footer}</div>}
    </aside>
  );
}
