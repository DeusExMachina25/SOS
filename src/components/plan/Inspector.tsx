"use client";

import React, { useRef, useState } from "react";
import { Copy, RotateCw, Trash2, X } from "lucide-react";

import { itemDef, itemSize } from "@/lib/plan/catalog";
import { duplicateItem, renameRoom, resizeItem, resizeRoom, rotateItem, setDimension, setOpeningWidth } from "@/lib/plan/edit";
import { formatArea, wallLength } from "@/lib/plan/geometry";
import type { Plan, Selection } from "@/lib/plan/types";

/**
 * Properties of whatever is selected. Every size is typed in metres and
 * applies on Enter or when the box loses focus.
 */

interface Props {
  plan: Plan;
  selection: Selection;
  onChange: (p: Plan) => void;
  onSelect: (s: Selection) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function Inspector({ plan, selection, onChange, onSelect, onDelete, onClose }: Props) {
  let title = "";
  let body: React.ReactNode = null;

  if (selection.part === "room") {
    const r = plan.rooms.find((x) => x.id === selection.id)!;
    title = "Room";
    body = (
      <>
        <Field label="Name">
          <input value={r.name} onChange={(e) => onChange(renameRoom(plan, r.id, e.target.value))} className="plan-ed-input" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width (m)">
            <NumberInput value={r.w} onCommit={(v) => onChange(resizeRoom(plan, r.id, v, r.h))} />
          </Field>
          <Field label="Depth (m)">
            <NumberInput value={r.h} onCommit={(v) => onChange(resizeRoom(plan, r.id, r.w, v))} />
          </Field>
        </div>
        <Stat label="Floor area" value={formatArea(r.w * r.h)} />
      </>
    );
  } else if (selection.part === "wall") {
    const w = plan.walls.find((x) => x.id === selection.id)!;
    const inRoom = plan.rooms.some((r) => r.wallIds.includes(w.id));
    title = w.style === "boundary" ? "Boundary" : "Wall";
    body = (
      <>
        <Field label="Length (m)">
          <NumberInput value={Math.round(wallLength(w) * 100) / 100} onCommit={(v) => onChange(setDimension(plan, w.id, v))} />
        </Field>
        <p className="text-xs text-[var(--text-muted)]">
          {inRoom ? "Part of a room: changing it resizes the room." : "Tip: click any length on the plan to type a new one."}
        </p>
      </>
    );
  } else if (selection.part === "opening") {
    const o = plan.openings.find((x) => x.id === selection.id)!;
    title = o.kind === "door" ? "Door" : "Window";
    body = (
      <>
        <Field label="Width (m)">
          <NumberInput value={o.width} onCommit={(v) => onChange(setOpeningWidth(plan, o.id, v))} />
        </Field>
        <p className="text-xs text-[var(--text-muted)]">Drag it to slide it along the wall.</p>
      </>
    );
  } else {
    const it = plan.items.find((x) => x.id === selection.id)!;
    const def = itemDef(it.type);
    const size = itemSize(it) ?? { w: 1, h: 1 };
    title = def?.name ?? "Item";
    body = (
      <>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width (m)">
            <NumberInput value={size.w} onCommit={(v) => onChange(resizeItem(plan, it.id, v, size.h))} />
          </Field>
          <Field label="Depth (m)">
            <NumberInput value={size.h} onCommit={(v) => onChange(resizeItem(plan, it.id, size.w, v))} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onChange(rotateItem(plan, it.id))} className="plan-btn">
            <RotateCw size={13} /> Rotate 90°
          </button>
          <button
            onClick={() => {
              const next = duplicateItem(plan, it.id);
              onChange(next);
              onSelect({ part: "item", id: next.items[next.items.length - 1].id });
            }}
            className="plan-btn"
          >
            <Copy size={13} /> Duplicate
          </button>
        </div>
        {def && (size.w !== def.w || size.h !== def.h) && (
          <button onClick={() => onChange(resizeItem(plan, it.id, def.w, def.h))} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-4">
            Reset to library size
          </button>
        )}
      </>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <PanelTitle>{title}</PanelTitle>
        <button onClick={onClose} aria-label="Close properties" className="md:hidden p-1 -mt-3 text-[var(--text-muted)]">
          <X size={16} />
        </button>
      </div>
      {body}
      <button onClick={onDelete} className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs pt-1">
        <Trash2 size={13} /> Delete
      </button>
    </section>
  );
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono-sos text-[10px] tracking-[0.25em] uppercase text-[var(--color-orange)] mb-3">{children}</h2>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-t border-[var(--border)] pt-2">
      <span className="font-mono-sos text-[9px] tracking-[0.2em] uppercase text-[var(--text-muted)]">{label}</span>
      <span className="font-editorial text-xl">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono-sos text-[9px] tracking-[0.2em] uppercase text-[var(--text-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}

/** A number box that applies its value on Enter or when it loses focus. */
export function NumberInput({ value, onCommit, className = "plan-ed-input", autoFocus, onDone }: { value: number; onCommit: (v: number) => void; className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  const cancelled = useRef(false);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }
  const done = () => {
    if (cancelled.current) return;
    const v = parseFloat(text.replace(",", "."));
    if (Number.isFinite(v) && v > 0) onCommit(v);
    else setText(String(value));
    onDone?.();
  };
  return (
    <input
      inputMode="decimal"
      value={text}
      autoFocus={autoFocus}
      onFocus={(e) => autoFocus && e.currentTarget.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          // Leave without applying what was typed
          cancelled.current = true;
          setText(String(value));
          (e.currentTarget as HTMLInputElement).blur();
          cancelled.current = false;
          onDone?.();
        }
      }}
      className={className}
    />
  );
}
