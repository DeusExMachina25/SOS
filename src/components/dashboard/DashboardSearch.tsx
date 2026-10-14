"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CalendarDays, MessageSquare, LayoutDashboard } from "lucide-react";
import { getMySessions, getMyVaultFiles, getMyChatThreads } from "@/lib/data/queries";
import { searchDashboard, type SearchGroup, type SearchHit } from "@/lib/data/search";
import type { ChatThreadSummary, Session, VaultFile } from "@/lib/data/types";

const FRESH_FOR_MS = 30_000;

const GROUP_ICON: Record<SearchGroup, typeof Search> = {
  Pages: LayoutDashboard,
  Sessions: CalendarDays,
  Files: FileText,
  Conversations: MessageSquare,
};

/**
 * Top-bar search over pages and the user's own sessions, files and
 * conversations. The data loads the first time the box is focused (and again
 * if it is older than 30s), so opening the dashboard costs nothing extra.
 */
export default function DashboardSearch({
  role,
  pages,
}: {
  role: "client" | "expert";
  pages: { name: string; href: string }[];
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedAt = useRef(0);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [data, setData] = useState<{ sessions: Session[]; files: VaultFile[]; threads: ChatThreadSummary[] }>({
    sessions: [],
    files: [],
    threads: [],
  });
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const load = () => {
    if (status === "loading" || Date.now() - loadedAt.current < FRESH_FOR_MS) return;
    setStatus("loading");
    Promise.all([getMySessions(), getMyVaultFiles(), getMyChatThreads()])
      .then(([sessions, files, threads]) => {
        loadedAt.current = Date.now();
        setData({ sessions, files, threads });
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Search data failed to load", err);
        setStatus("error");
      });
  };

  const hits: SearchHit[] = useMemo(
    () => searchDashboard(query, { role, pages, ...data }),
    [query, role, pages, data]
  );

  // Close on an outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Ctrl/Cmd+K focuses the box from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const hit = hits[active];
      if (open && hit) {
        e.preventDefault();
        go(hit);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open;

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <label className="flex items-center gap-2 border border-[var(--border)] bg-[var(--bg-base)] px-3 h-9 w-[200px] xl:w-[260px] focus-within:border-[var(--border-strong)] transition-colors">
        <Search size={13} className="text-[var(--text-faint)] shrink-0" strokeWidth={1.75} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="dashboard-search-results"
          aria-activedescendant={showPanel && hits[active] ? `search-hit-${hits[active].id}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search"
          aria-label="Search the dashboard"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            load();
          }}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent font-inter text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none"
        />
        <kbd className="hidden xl:block shrink-0 border border-[var(--border)] px-1 font-mono-sos text-[8px] text-[var(--text-faint)]">Ctrl K</kbd>
      </label>

      {showPanel && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[360px] max-w-[90vw] border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <ul id="dashboard-search-results" role="listbox" aria-label="Search results" className="max-h-[360px] overflow-y-auto py-1">
            {hits.map((hit, i) => {
              const header = i === 0 || hits[i - 1].group !== hit.group ? hit.group : null;
              const Icon = GROUP_ICON[hit.group];
              return (
                <li key={hit.id} role="presentation">
                  {header && (
                    <p className="px-4 pt-3 pb-1 font-mono-sos text-[8px] tracking-[0.25em] text-[var(--text-faint)]">
                      {query.trim() ? header : "Jump to"}
                    </p>
                  )}
                  <div
                    id={`search-hit-${hit.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(hit)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2 ${i === active ? "bg-[var(--bg-surface-2)]" : ""}`}
                  >
                    <Icon size={14} strokeWidth={1.75} className="shrink-0 text-[var(--text-faint)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-inter text-[12px] text-[var(--text-primary)]">{hit.title}</span>
                      {hit.detail && <span className="block truncate font-inter text-[11px] text-[var(--text-muted)]">{hit.detail}</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {query.trim() && hits.length === 0 && status !== "loading" && (
            <p className="px-4 py-4 font-mono-sos text-[10px] tracking-[0.15em] text-[var(--text-faint)]">NO MATCHES FOR &ldquo;{query.trim()}&rdquo;</p>
          )}
          {status === "loading" && (
            <p className="px-4 py-2 font-mono-sos text-[9px] tracking-[0.15em] text-[var(--text-faint)]" aria-live="polite">LOADING YOUR SESSIONS, FILES AND MESSAGES…</p>
          )}
          {status === "error" && (
            <p className="px-4 py-2 font-mono-sos text-[9px] tracking-[0.15em] text-[var(--color-orange)]" aria-live="polite">COULDN&apos;T LOAD SESSIONS AND FILES. PAGES ARE STILL SEARCHABLE.</p>
          )}
        </div>
      )}
    </div>
  );
}
