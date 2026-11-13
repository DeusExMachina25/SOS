"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import SosMark from "../shared/SosMark";
import { badgeText, unreadLabel } from "@/lib/data/unread";

export interface NavItem {
  name: string;
  icon: LucideIcon;
  path: string;
  /** When set, the item runs this instead of navigating (e.g. open the Preferences panel). */
  onSelect?: () => void;
  /** Unread/pending count shown as a small badge on the icon */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface IconRailProps {
  groups: NavGroup[];
  /** Pinned to the foot of the rail, e.g. sign out */
  footer?: React.ReactNode;
}

/**
 * The dashboard's desktop navigation: a slim column of square icon chips.
 * Names show as a tooltip on hover and keyboard focus, and are always the
 * accessible name, so nothing is lost by hiding the labels.
 * Below lg the layout's bottom bar takes over.
 */
export default function IconRail({ groups, footer }: IconRailProps) {
  const pathname = usePathname();
  // The account group (Settings) sits at the bottom with the footer, like the reference.
  const main = groups.filter((g) => g.label !== "Account");
  const account = groups.filter((g) => g.label === "Account");

  const renderItem = (item: NavItem) => {
    const active = !item.onSelect && pathname === item.path;
    const className = `group/rail relative flex h-12 w-12 items-center justify-center transition-colors duration-200 ${
      active
        ? "bg-[var(--color-primary)] text-[var(--bg-base)]"
        : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
    }`;
    const content = (
      <>
        <item.icon size={18} strokeWidth={1.75} />
        {typeof item.badge === "number" && item.badge > 0 && (
          <span
            aria-label={unreadLabel(item.badge)}
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center bg-[var(--color-orange)] px-1 font-mono-sos text-[8px] leading-none tracking-normal text-[var(--bg-base)] tabular-nums"
          >
            {badgeText(item.badge)}
          </span>
        )}
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap border border-[var(--border-strong)] bg-[var(--bg-base)] px-2.5 py-1.5 font-mono-sos text-[9px] tracking-[0.18em] text-[var(--text-primary)] opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100"
        >
          {item.name}
        </span>
      </>
    );
    return (
      <li key={item.name}>
        {item.onSelect ? (
          <button type="button" onClick={item.onSelect} aria-label={item.name} className={className}>
            {content}
          </button>
        ) : (
          <Link href={item.path} aria-label={item.name} aria-current={active ? "page" : undefined} className={className}>
            {content}
          </Link>
        )}
      </li>
    );
  };

  return (
    <aside className="hidden lg:flex w-[92px] shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--bg-surface)] py-6">
      <Link href="/" aria-label="SOS home" className="flex h-12 items-center justify-center">
        <SosMark className="text-[13px]" label={null} />
      </Link>

      <nav aria-label="Dashboard" className="flex flex-1 flex-col items-center justify-center">
        {main.map((group, i) => (
          <ul key={group.label} className={`flex flex-col items-center gap-2 ${i > 0 ? "mt-6 border-t border-[var(--border)] pt-6" : ""}`}>
            {group.items.map(renderItem)}
          </ul>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-2">
        {account.map((group) => (
          <ul key={group.label} className="flex flex-col items-center gap-2">
            {group.items.map(renderItem)}
          </ul>
        ))}
        {footer}
      </div>
    </aside>
  );
}
