"use client";

import React, { useMemo, useState } from "react";
import { Lock, Search, X } from "lucide-react";

import { CATEGORIES, itemsFor, type Category, type ItemDef } from "@/lib/plan/catalog";
import { formatLength } from "@/lib/plan/geometry";
import type { PlanKind } from "@/lib/plan/types";

/**
 * The furniture library: search, shelves and true-to-scale previews.
 * Drag a piece onto the plan (mouse), or pick it and tap the plan (touch).
 * A drawer beside the tool rail from md up; a bottom sheet on phones.
 */

/** MIME type for drag and drop from the library onto the canvas. */
export const ITEM_DRAG_TYPE = "application/x-sos-plan-item";

interface Props {
  kind: PlanKind;
  locked: (def: ItemDef) => boolean;
  picked: string;
  onPick: (def: ItemDef) => void;
  onClose: () => void;
}

export default function LibraryPanel({ kind, locked, picked, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState<Category | "all">("all");

  const all = itemsFor(kind);
  const shelves = useMemo(() => (Object.keys(CATEGORIES) as Category[]).filter((c) => all.some((i) => i.category === c)), [all]);
  const q = query.trim().toLowerCase();
  const shown = all.filter((i) => (shelf === "all" || i.category === shelf) && (!q || i.name.toLowerCase().includes(q)));
  // One scale for every preview, so a sofa looks smaller than a bed
  const pxPerM = 22;

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-mono-sos text-[10px] tracking-[0.25em] uppercase text-[var(--color-orange)]">Library</h2>
        <button onClick={onClose} aria-label="Close library" className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X size={16} />
        </button>
      </div>

      <label className="flex items-center gap-2 border border-[var(--border-strong)] px-3 py-2 focus-within:border-[var(--color-primary)]">
        <Search size={14} className="text-[var(--text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search furniture"
          aria-label="Search the library"
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
        />
      </label>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Shelves">
        <button className="plan-chip" aria-pressed={shelf === "all"} onClick={() => setShelf("all")}>All</button>
        {shelves.map((c) => (
          <button key={c} className="plan-chip" aria-pressed={shelf === c} onClick={() => setShelf(c)}>
            {CATEGORIES[c]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-2 gap-2 overflow-y-auto pr-1 -mr-1">
        {shown.map((def) => {
          const isLocked = locked(def);
          const fit = Math.min(pxPerM, 56 / Math.max(def.w, def.h));
          const w = def.w * fit;
          const h = def.h * fit;
          return (
            <button
              key={def.type}
              draggable={!isLocked}
              onDragStart={(e) => {
                e.dataTransfer.setData(ITEM_DRAG_TYPE, def.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onPick(def)}
              aria-pressed={picked === def.type}
              className={`plan-tile relative flex flex-col items-stretch text-left ${isLocked ? "opacity-50" : "cursor-grab active:cursor-grabbing"}`}
            >
              <span className="flex items-center justify-center h-[68px] border-b border-[var(--border)]">
                <svg width={60} height={60} viewBox="-30 -30 60 60" aria-hidden>
                  {def.shape === "round" ? (
                    <ellipse rx={w / 2} ry={h / 2} fill="none" stroke="var(--text-muted)" strokeWidth={1.2} />
                  ) : (
                    <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke="var(--text-muted)" strokeWidth={1.2} />
                  )}
                </svg>
              </span>
              <span className="px-2 pt-1.5 text-[12px] leading-tight">{def.name}</span>
              <span className="px-2 pb-1.5 font-mono-sos text-[9px] text-[var(--text-muted)]">
                {formatLength(def.w)} × {formatLength(def.h)}
              </span>
              {isLocked && (
                <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--bg-base)] border border-[var(--border-strong)] font-mono-sos text-[8px] tracking-[0.12em] uppercase text-[var(--text-muted)]">
                  <Lock size={9} /> Sign in
                </span>
              )}
            </button>
          );
        })}
        {!shown.length && <p className="col-span-full text-sm text-[var(--text-muted)] py-6 text-center">Nothing matches “{query}”.</p>}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-auto">
        <span className="hidden md:inline">Drag a piece onto the plan, or pick one and click where it goes.</span>
        <span className="md:hidden">Pick a piece, then tap the plan to place it.</span>
      </p>
    </div>
  );
}
