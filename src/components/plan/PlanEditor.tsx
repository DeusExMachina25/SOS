"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DoorOpen,
  Download,
  Hand,
  Maximize,
  MousePointer2,
  Redo2,
  RectangleHorizontal,
  Save,
  Sofa,
  Trash2,
  Undo2,
  RotateCw,
  Minus,
  Plus,
  PenLine,
  AppWindow,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/utils/supabase/client";
import { EXPERT_TYPES, PLAN_KINDS, itemDef, itemsFor } from "@/lib/plan/catalog";
import {
  addItem,
  addOpening,
  addRoom,
  addWall,
  bounds,
  commit,
  move,
  redo,
  remove,
  renameRoom,
  rotateItem,
  setOpeningWidth,
  setWallLength,
  slideOpening,
  startHistory,
  undo,
  type History,
} from "@/lib/plan/edit";
import { examplePlan } from "@/lib/plan/examples";
import { formatLength, nearestEnd, nearestWall, projectOnWall, snap, straighten, wallLength } from "@/lib/plan/geometry";
import { GUEST_LIMITS, MEMBER_PERKS, blockedReason, type Countable, type Tier } from "@/lib/plan/limits";
import { deletePlan, listPlans, loadDraft, loadPlan, saveDraft, savePlan, type SavedPlan } from "@/lib/plan/storage";
import type { Plan, PlanKind, Point, Selection } from "@/lib/plan/types";
import PlanDrawing, { type View } from "./PlanDrawing";
import { downloadPlanImage } from "./exportPlan";

/**
 * The floorplan sketcher. Anyone can draw; signing in removes the limits
 * (src/lib/plan/limits.ts), opens the full item library and saves plans to
 * the account.
 */

type Tool = "select" | "wall" | "room" | "door" | "window" | "item" | "pan";

const TOOLS: { id: Tool; name: string; key: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "select", name: "Select", key: "v", Icon: MousePointer2 },
  { id: "room", name: "Room", key: "r", Icon: RectangleHorizontal },
  { id: "wall", name: "Wall", key: "w", Icon: PenLine },
  { id: "door", name: "Door", key: "d", Icon: DoorOpen },
  { id: "window", name: "Window", key: "n", Icon: AppWindow },
  { id: "item", name: "Items", key: "i", Icon: Sofa },
  { id: "pan", name: "Move view", key: "h", Icon: Hand },
];

const MIN_SCALE = 8;
const MAX_SCALE = 240;

type Drag =
  | { kind: "pan"; start: Point; view: View }
  | { kind: "move"; sel: Selection; start: Point; base: Plan }
  | { kind: "slide"; id: string; base: Plan }
  | { kind: "room"; start: Point };

export default function PlanEditor() {
  const [history, setHistory] = useState<History>(() => startHistory(examplePlan("interior")));
  const plan = history.present;
  const [preview, setPreview] = useState<Plan | null>(null);
  const shown = preview ?? plan;

  const [tool, setTool] = useState<Tool>("select");
  const [itemType, setItemType] = useState<string>("sofa");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [view, setView] = useState<View>({ scale: 60, ox: 40, oy: 40 });
  const [cursor, setCursor] = useState<Point | null>(null);
  const [chainStart, setChainStart] = useState<Point | null>(null);
  const [roomDraft, setRoomDraft] = useState<{ a: Point; b: Point } | null>(null);
  const [notice, setNotice] = useState<{ text: string; signIn?: boolean } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const tier: Tier = user ? "member" : "guest";
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPlan[]>([]);
  const [busy, setBusy] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ dist: number; view: View; mid: Point } | null>(null);
  const loaded = useRef(false);

  // ---- setup: restore the draft, learn who is signed in -------------------
  useEffect(() => {
    const draft = loadDraft();
    // The draft lives in this browser, so it can only be read after mounting
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setHistory(startHistory(draft));
    loaded.current = true;
    requestAnimationFrame(() => fitTo(draft ?? examplePlan("interior")));
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const id = setTimeout(() => saveDraft(plan), 400);
    return () => clearTimeout(id);
  }, [plan]);

  const refreshSaved = useCallback(async () => {
    if (!supabase || !user) return setSaved([]);
    try {
      setSaved(await listPlans(supabase));
    } catch (e) {
      setNotice({ text: (e as Error).message });
    }
  }, [user]);

  useEffect(() => {
    // Loading the account's plans once sign-in is known
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSaved();
  }, [refreshSaved]);

  // ---- helpers -------------------------------------------------------------
  const apply = useCallback((next: Plan) => setHistory((h) => commit(h, next)), []);

  const allowed = useCallback(
    (part: Countable, adding = 1, type?: string) => {
      const reason = blockedReason(plan, part, tier, adding, type);
      if (reason) setNotice({ text: reason, signIn: true });
      return !reason;
    },
    [plan, tier]
  );

  const toWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const r = svgRef.current!.getBoundingClientRect();
      return { x: (clientX - r.left - view.ox) / view.scale, y: (clientY - r.top - view.oy) / view.scale };
    },
    [view]
  );

  /** Snaps to a wall end nearby, else to the 10 cm grid. */
  const snapPoint = useCallback(
    (p: Point) => nearestEnd(p, plan.walls, 12 / view.scale) ?? snap(p),
    [plan.walls, view.scale]
  );

  function fitTo(p: Plan) {
    const box = boxRef.current?.getBoundingClientRect();
    const b = bounds(p);
    if (!box || !b) return;
    const pad = 48;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min((box.width - pad * 2) / Math.max(b.w, 1), (box.height - pad * 2) / Math.max(b.h, 1))));
    setView({ scale, ox: (box.width - b.w * scale) / 2 - b.x * scale, oy: (box.height - b.h * scale) / 2 - b.y * scale });
  }

  const zoomBy = useCallback((factor: number, at?: Point) => {
    setView((v) => {
      const box = boxRef.current?.getBoundingClientRect();
      const cx = at?.x ?? (box ? box.width / 2 : 0);
      const cy = at?.y ?? (box ? box.height / 2 : 0);
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
      const k = scale / v.scale;
      return { scale, ox: cx - (cx - v.ox) * k, oy: cy - (cy - v.oy) * k };
    });
  }, []);

  /** What sits under a point, topmost first. */
  const hitTest = useCallback(
    (p: Point): Selection | null => {
      const reach = 10 / view.scale;
      for (const it of [...plan.items].reverse()) {
        const def = itemDef(it.type);
        if (!def) continue;
        const a = (-it.rotation * Math.PI) / 180;
        const dx = p.x - it.x;
        const dy = p.y - it.y;
        const lx = dx * Math.cos(a) - dy * Math.sin(a);
        const ly = dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(lx) <= def.w / 2 && Math.abs(ly) <= def.h / 2) return { part: "item", id: it.id };
      }
      for (const o of plan.openings) {
        const w = plan.walls.find((x) => x.id === o.wallId);
        if (!w) continue;
        const hit = projectOnWall(p, w);
        const along = Math.abs(hit.t - o.t) * wallLength(w);
        if (hit.dist <= reach + 0.1 && along <= o.width / 2) return { part: "opening", id: o.id };
      }
      const wall = nearestWall(p, plan.walls, reach + 0.08);
      if (wall) return { part: "wall", id: wall.wall.id };
      for (const r of [...plan.rooms].reverse()) {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return { part: "room", id: r.id };
      }
      return null;
    },
    [plan, view.scale]
  );

  const finishChain = useCallback(() => setChainStart(null), []);

  const chooseTool = useCallback((t: Tool) => {
    setTool(t);
    setChainStart(null);
    setRoomDraft(null);
    if (t !== "select") setSelection(null);
  }, []);

  // ---- pointer input -------------------------------------------------------
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const r = svgRef.current!.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    svgRef.current!.setPointerCapture(e.pointerId);

    // Two fingers: pinch to zoom, whatever the tool
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(p2.x - p1.x, p2.y - p1.y), view, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
      drag.current = null;
      setPreview(null);
      setRoomDraft(null);
      return;
    }

    const world = toWorld(e.clientX, e.clientY);
    const screen = { x: e.clientX, y: e.clientY };
    setNotice(null);

    if (tool === "pan" || e.button === 1) {
      drag.current = { kind: "pan", start: screen, view };
      return;
    }

    if (tool === "select") {
      const hit = hitTest(world);
      setSelection(hit);
      if (!hit) drag.current = { kind: "pan", start: screen, view };
      else if (hit.part === "opening") drag.current = { kind: "slide", id: hit.id, base: plan };
      else drag.current = { kind: "move", sel: hit, start: snap(world), base: plan };
      return;
    }

    if (tool === "room") {
      if (!allowed("rooms") || !allowed("walls", 4)) return;
      const p = snapPoint(world);
      drag.current = { kind: "room", start: p };
      setRoomDraft({ a: p, b: p });
      return;
    }

    if (tool === "wall") {
      const p = snapPoint(world);
      if (!chainStart) return setChainStart(p);
      const end = snapPoint(straighten(chainStart, p));
      if (end.x === chainStart.x && end.y === chainStart.y) return finishChain();
      if (!allowed("walls")) return;
      const closesShape = plan.walls.some((w) => (w.a.x === end.x && w.a.y === end.y) || (w.b.x === end.x && w.b.y === end.y));
      apply(addWall(plan, chainStart, end, plan.kind === "interior" ? "wall" : "boundary"));
      setChainStart(closesShape ? null : end);
      return;
    }

    if (tool === "door" || tool === "window") {
      const hit = nearestWall(world, plan.walls, 16 / view.scale + 0.1);
      if (!hit) return setNotice({ text: `Tap on a wall to add a ${tool}.` });
      if (!allowed("openings")) return;
      apply(addOpening(plan, tool, hit.wall.id, hit.t));
      return;
    }

    if (tool === "item") {
      if (!allowed("items", 1, itemType)) return;
      const next = addItem(plan, itemType, snap(world));
      apply(next);
      setSelection({ part: "item", id: next.items[next.items.length - 1].id });
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = svgRef.current!.getBoundingClientRect();
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });

    if (pinch.current && pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      const { dist, view: v0, mid } = pinch.current;
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (v0.scale * Math.hypot(p2.x - p1.x, p2.y - p1.y)) / dist));
      const k = scale / v0.scale;
      const nm = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      setView({ scale, ox: nm.x - (mid.x - v0.ox) * k, oy: nm.y - (mid.y - v0.oy) * k });
      return;
    }

    const world = toWorld(e.clientX, e.clientY);
    setCursor(world);
    const d = drag.current;
    if (!d) return;

    if (d.kind === "pan") {
      setView({ ...d.view, ox: d.view.ox + e.clientX - d.start.x, oy: d.view.oy + e.clientY - d.start.y });
    } else if (d.kind === "move") {
      const p = snap(world);
      setPreview(move(d.base, d.sel, p.x - d.start.x, p.y - d.start.y));
    } else if (d.kind === "slide") {
      const o = d.base.openings.find((x) => x.id === d.id);
      const w = o && d.base.walls.find((x) => x.id === o.wallId);
      if (w) setPreview(slideOpening(d.base, d.id, projectOnWall(world, w).t));
    } else if (d.kind === "room") {
      setRoomDraft({ a: d.start, b: snapPoint(world) });
    }
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if ((d.kind === "move" || d.kind === "slide") && preview) {
      apply(preview);
      setPreview(null);
    } else if (d.kind === "room" && roomDraft) {
      const next = addRoom(plan, roomDraft.a, roomDraft.b, `Room ${plan.rooms.length + 1}`);
      setRoomDraft(null);
      if (next !== plan) {
        apply(next);
        setSelection({ part: "room", id: next.rooms[next.rooms.length - 1].id });
      } else {
        setNotice({ text: "Drag across the grid to draw a room at least 50 cm wide." });
      }
    }
  }

  // Wheel zoom (needs a non-passive listener to stop the page scrolling)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // ---- keyboard ------------------------------------------------------------
  const deleteSelection = useCallback(() => {
    if (!selection) return;
    apply(remove(plan, selection));
    setSelection(null);
  }, [apply, plan, selection]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory((h) => (e.shiftKey ? redo(h) : undo(h)));
        setSelection(null);
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        setHistory(redo);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelection();
      } else if (e.key === "Escape") {
        finishChain();
        setRoomDraft(null);
        setSelection(null);
      } else if (!mod) {
        const t = TOOLS.find((x) => x.key === e.key.toLowerCase());
        if (t) chooseTool(t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooseTool, deleteSelection, finishChain]);

  // ---- plan-level actions --------------------------------------------------
  function changeKind(kind: PlanKind) {
    if (kind === plan.kind) return;
    apply({ ...plan, kind });
    const first = itemsFor(kind).find((i) => i.guest);
    if (first) setItemType(first.type);
  }

  function startFresh(kind: PlanKind, example: boolean) {
    const next = example ? examplePlan(kind) : { ...examplePlan(kind), walls: [], openings: [], rooms: [], items: [], name: "My plan" };
    setHistory(startHistory(next));
    setSelection(null);
    setSavedId(null);
    setChainStart(null);
    if (example) requestAnimationFrame(() => fitTo(next));
    else setView({ scale: 60, ox: 40, oy: 40 });
  }

  async function onSave() {
    if (!supabase || !user) return setNotice({ text: "Sign in to save plans to your account.", signIn: true });
    setBusy(true);
    try {
      const id = await savePlan(supabase, plan, savedId ?? undefined);
      setSavedId(id);
      setNotice({ text: "Saved to your account." });
      await refreshSaved();
    } catch (e) {
      setNotice({ text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function onOpen(id: string) {
    if (!supabase) return;
    setBusy(true);
    try {
      const p = await loadPlan(supabase, id);
      setHistory(startHistory(p));
      setSavedId(id);
      setSelection(null);
      requestAnimationFrame(() => fitTo(p));
    } catch (e) {
      setNotice({ text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!supabase || !window.confirm("Delete this saved plan? This can't be undone.")) return;
    try {
      await deletePlan(supabase, id);
      if (savedId === id) setSavedId(null);
      await refreshSaved();
    } catch (e) {
      setNotice({ text: (e as Error).message });
    }
  }

  async function onDownload() {
    if (tier !== "member") return setNotice({ text: "Sign in to download your plan as an image.", signIn: true });
    try {
      await downloadPlanImage(svgRef.current!, plan.name);
    } catch {
      setNotice({ text: "The download didn't work in this browser. Try another browser." });
    }
  }

  // ---- what the side panel shows --------------------------------------------
  const selected = useMemo(() => {
    if (!selection) return null;
    const list = { wall: plan.walls, room: plan.rooms, opening: plan.openings, item: plan.items }[selection.part] as { id: string }[];
    return list.find((x) => x.id === selection.id) ? selection : null;
  }, [plan, selection]);

  const kindInfo = PLAN_KINDS[plan.kind];
  const library = itemsFor(plan.kind);

  // Wall being drawn
  const wallEnd = chainStart && cursor ? snapPoint(straighten(chainStart, cursor)) : null;
  const sx = (x: number) => x * view.scale + view.ox;
  const sy = (y: number) => y * view.scale + view.oy;

  return (
    <div className="plan-ed flex flex-col h-full text-[var(--text-primary)]">
      {/* ---- top bar ---- */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 px-4 md:px-6 py-3 border-b border-[var(--border)]">
        <input
          aria-label="Plan name"
          value={plan.name}
          onChange={(e) => apply({ ...plan, name: e.target.value.slice(0, 80) })}
          className="font-editorial text-xl md:text-2xl bg-transparent border-b border-transparent focus:border-[var(--border-strong)] outline-none min-w-0 w-40 md:w-64"
        />
        <div role="radiogroup" aria-label="What are you planning?" className="flex rounded-full border border-[var(--border-strong)] overflow-hidden">
          {(Object.keys(PLAN_KINDS) as PlanKind[]).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={plan.kind === k}
              onClick={() => changeKind(k)}
              className={`px-3 py-1.5 font-mono-sos text-[10px] md:text-[11px] tracking-[0.15em] uppercase transition-colors ${
                plan.kind === k ? "bg-[var(--text-primary)] text-[var(--bg-base)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {PLAN_KINDS[k].name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <IconButton label="Undo" onClick={() => setHistory(undo)} disabled={!history.past.length}><Undo2 size={16} /></IconButton>
          <IconButton label="Redo" onClick={() => setHistory(redo)} disabled={!history.future.length}><Redo2 size={16} /></IconButton>
          <IconButton label="Zoom out" onClick={() => zoomBy(1 / 1.25)} className="hidden md:inline-flex"><Minus size={16} /></IconButton>
          <IconButton label="Zoom in" onClick={() => zoomBy(1.25)} className="hidden md:inline-flex"><Plus size={16} /></IconButton>
          <IconButton label="Fit plan to screen" onClick={() => fitTo(plan)}><Maximize size={16} /></IconButton>
          <IconButton label="Download image" onClick={onDownload}><Download size={16} /></IconButton>
          {user ? (
            <button onClick={onSave} disabled={busy} className="btn-sos btn-sos-filled ml-1 !px-4 !py-2 text-xs inline-flex items-center gap-2 whitespace-nowrap">
              <Save size={14} /> {savedId ? "Save" : "Save to account"}
            </button>
          ) : (
            <Link href="/login?redirectedFrom=/sketch" className="btn-sos ml-1 !px-4 !py-2 text-xs whitespace-nowrap">
              Sign in to save
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* ---- tools ---- */}
        <div role="toolbar" aria-label="Drawing tools" className="order-2 md:order-1 flex md:flex-col gap-1 p-2 border-b md:border-b-0 md:border-r border-[var(--border)] overflow-x-auto shrink-0">
          {TOOLS.map(({ id, name, key, Icon }) => (
            <button
              key={id}
              onClick={() => chooseTool(id)}
              aria-pressed={tool === id}
              title={`${name} (${key.toUpperCase()})`}
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] px-2 py-2 rounded-md font-mono-sos text-[9px] tracking-[0.12em] uppercase transition-colors ${
                tool === id ? "bg-[var(--color-primary-pale)] text-[var(--color-primary)] ring-1 ring-[var(--border-strong)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </div>

        {/* ---- canvas ---- */}
        <div ref={boxRef} className="order-1 md:order-2 relative h-[62svh] md:h-auto md:flex-1 overflow-hidden bg-[var(--bg-base)]">
          <svg
            ref={svgRef}
            className={`plan-ed-canvas absolute inset-0 w-full h-full select-none ${tool === "pan" ? "cursor-grab" : tool === "select" ? "cursor-default" : "cursor-crosshair"}`}
            style={{ touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => setCursor(null)}
            onDoubleClick={finishChain}
            role="img"
            aria-label={`Floorplan: ${plan.name}`}
          >
            <defs>
              <pattern id="plan-ed-grid" width={view.scale} height={view.scale} patternUnits="userSpaceOnUse" x={view.ox} y={view.oy}>
                <path d={`M${view.scale} 0 H0 V${view.scale}`} fill="none" stroke="var(--border-strong)" strokeWidth="0.7" />
                {view.scale > 40 && <path d={`M${view.scale / 2} 0 V${view.scale} M0 ${view.scale / 2} H${view.scale}`} fill="none" stroke="var(--border)" strokeWidth="0.5" />}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#plan-ed-grid)" className="plan-ed-grid" />

            <PlanDrawing plan={shown} view={view} selection={selected} />

            {roomDraft && (
              <g>
                <rect
                  x={sx(Math.min(roomDraft.a.x, roomDraft.b.x))}
                  y={sy(Math.min(roomDraft.a.y, roomDraft.b.y))}
                  width={Math.abs(roomDraft.b.x - roomDraft.a.x) * view.scale}
                  height={Math.abs(roomDraft.b.y - roomDraft.a.y) * view.scale}
                  fill="var(--color-primary-pale)"
                  stroke="var(--color-orange)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <text x={sx(Math.max(roomDraft.a.x, roomDraft.b.x)) + 8} y={sy(Math.max(roomDraft.a.y, roomDraft.b.y)) + 16} className="plan-ed-len">
                  {formatLength(Math.abs(roomDraft.b.x - roomDraft.a.x))} × {formatLength(Math.abs(roomDraft.b.y - roomDraft.a.y))}
                </text>
              </g>
            )}

            {chainStart && (
              <circle cx={sx(chainStart.x)} cy={sy(chainStart.y)} r={5} fill="var(--color-orange)" />
            )}
            {chainStart && wallEnd && (
              <g>
                <line x1={sx(chainStart.x)} y1={sy(chainStart.y)} x2={sx(wallEnd.x)} y2={sy(wallEnd.y)} stroke="var(--color-orange)" strokeWidth={Math.max(3, 0.15 * view.scale)} strokeOpacity={0.7} />
                <text x={sx(wallEnd.x) + 10} y={sy(wallEnd.y) - 10} className="plan-ed-len">
                  {formatLength(Math.hypot(wallEnd.x - chainStart.x, wallEnd.y - chainStart.y))}
                </text>
              </g>
            )}
          </svg>

          {/* scale bar */}
          <div className="pointer-events-none absolute left-3 bottom-3 flex items-end gap-2 font-mono-sos text-[10px] text-[var(--text-muted)]">
            <span className="block h-2 border-x border-b border-[var(--text-muted)]" style={{ width: view.scale }} />1 m
          </div>

          {chainStart && (
            <div className="absolute right-3 bottom-3">
              <button onClick={finishChain} className="btn-sos !px-4 !py-2 text-xs bg-[var(--bg-base)]">
                Finish wall
              </button>
            </div>
          )}

          {notice && (
            <div role="status" className="absolute left-1/2 -translate-x-1/2 top-3 max-w-[90%] px-4 py-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-overlay)] backdrop-blur text-sm flex items-center gap-3">
              <span>{notice.text}</span>
              {notice.signIn && !user && (
                <Link href="/login?redirectedFrom=/sketch" className="font-mono-sos text-[10px] tracking-[0.15em] uppercase text-[var(--color-primary)] whitespace-nowrap">
                  Sign in
                </Link>
              )}
              <button onClick={() => setNotice(null)} aria-label="Dismiss" className="text-[var(--text-muted)]">×</button>
            </div>
          )}
        </div>

        {/* ---- side panel ---- */}
        <aside className="order-3 md:w-72 xl:w-80 shrink-0 md:border-l border-[var(--border)] p-4 md:p-5 md:overflow-y-auto space-y-6 text-sm">
          {selected ? (
            <SelectionPanel
              plan={plan}
              selection={selected}
              onChange={apply}
              onDelete={deleteSelection}
            />
          ) : tool === "item" ? (
            <section>
              <PanelTitle>{kindInfo.name} items</PanelTitle>
              <div className="grid grid-cols-2 gap-2">
                {library.map((def) => {
                  const locked = tier === "guest" && !def.guest;
                  return (
                    <button
                      key={def.type}
                      onClick={() => (locked ? setNotice({ text: "Sign in to use the full item library.", signIn: true }) : setItemType(def.type))}
                      aria-pressed={itemType === def.type}
                      className={`text-left px-3 py-2 rounded-md border transition-colors ${
                        itemType === def.type ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                      } ${locked ? "opacity-45" : ""}`}
                    >
                      <span className="block text-[13px] leading-tight">{def.name}</span>
                      <span className="block font-mono-sos text-[9px] text-[var(--text-muted)] mt-1">
                        {locked ? "Sign in" : `${formatLength(def.w)} × ${formatLength(def.h)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[var(--text-muted)] text-xs">Pick an item, then tap the plan to place it.</p>
            </section>
          ) : (
            <section>
              <PanelTitle>How to draw</PanelTitle>
              <Tip tool={tool} />
            </section>
          )}

          <section>
            <PanelTitle>Who can review this</PanelTitle>
            <p className="text-[var(--text-muted)] mb-2">{kindInfo.hint}.</p>
            <ul className="space-y-1">
              {kindInfo.experts.map((x) => (
                <li key={x} className="flex justify-between gap-2">
                  <span>{EXPERT_TYPES[x].name}</span>
                </li>
              ))}
            </ul>
            <Link href="/platter" className="inline-block mt-3 font-mono-sos text-[10px] tracking-[0.15em] uppercase text-[var(--color-primary)]">
              Find an expert →
            </Link>
          </section>

          {user ? (
            <section>
              <PanelTitle>Your plans</PanelTitle>
              {saved.length === 0 ? (
                <p className="text-[var(--text-muted)]">Nothing saved yet. Use “Save to account” above.</p>
              ) : (
                <ul className="space-y-1">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <button onClick={() => onOpen(s.id)} className={`flex-1 text-left truncate hover:text-[var(--color-primary)] ${s.id === savedId ? "text-[var(--color-primary)]" : ""}`}>
                        {s.name}
                        <span className="ml-2 font-mono-sos text-[9px] text-[var(--text-muted)] uppercase">{PLAN_KINDS[s.kind]?.name}</span>
                      </button>
                      <button onClick={() => onDelete(s.id)} aria-label={`Delete ${s.name}`} className="text-[var(--text-faint)] hover:text-[var(--text-primary)]">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="rounded-md border border-[var(--border-strong)] p-4">
              <PanelTitle>Free sketcher</PanelTitle>
              <p className="text-[var(--text-muted)] mb-2">
                Up to {GUEST_LIMITS.rooms} rooms, {GUEST_LIMITS.openings} doors and windows and {GUEST_LIMITS.items} items, kept in this browser. Signing in adds:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--text-muted)]">
                {MEMBER_PERKS.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <Link href="/login?redirectedFrom=/sketch" className="btn-sos btn-sos-filled mt-4 !px-4 !py-2 text-xs inline-block">
                Sign in
              </Link>
            </section>
          )}

          <section>
            <PanelTitle>Start again</PanelTitle>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => startFresh(plan.kind, false)} className="btn-sos !px-3 !py-1.5 text-[11px]">Blank plan</button>
              <button onClick={() => startFresh(plan.kind, true)} className="btn-sos !px-3 !py-1.5 text-[11px]">Example {kindInfo.name.toLowerCase()}</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function IconButton({ label, onClick, disabled, className = "", children }: { label: string; onClick: () => void; disabled?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`p-2 rounded-md ${className} text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono-sos text-[10px] tracking-[0.25em] uppercase text-[var(--color-orange)] mb-3">{children}</h2>;
}

const TIPS: Record<Tool, string[]> = {
  select: ["Tap something to select it, then drag to move it.", "Drag empty space to move around. Pinch or scroll to zoom.", "Delete removes the selection. Ctrl+Z undoes."],
  room: ["Drag from one corner to the opposite corner.", "The room gets four walls you can add doors and windows to."],
  wall: ["Tap where the wall starts, then tap where it ends.", "Keep tapping to carry on. Tap the start again, double-tap or press Finish to stop.", "Walls snap straight and join up with nearby ends."],
  door: ["Tap on a wall to add a 90 cm door.", "Select it to change its width or slide it along the wall."],
  window: ["Tap on a wall to add a 1.2 m window.", "Select it to change its width or slide it along the wall."],
  item: ["Pick an item, then tap the plan to place it."],
  pan: ["Drag to move around the plan. Pinch or scroll to zoom."],
};

function Tip({ tool }: { tool: Tool }) {
  return (
    <ul className="space-y-1.5 text-[var(--text-muted)]">
      {TIPS[tool].map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
}

function SelectionPanel({ plan, selection, onChange, onDelete }: { plan: Plan; selection: Selection; onChange: (p: Plan) => void; onDelete: () => void }) {
  let body: React.ReactNode = null;
  let title = "";

  if (selection.part === "room") {
    const r = plan.rooms.find((x) => x.id === selection.id)!;
    title = "Room";
    body = (
      <>
        <Field label="Name">
          <input value={r.name} onChange={(e) => onChange(renameRoom(plan, r.id, e.target.value))} className="plan-ed-input" />
        </Field>
        <p className="text-[var(--text-muted)]">
          {formatLength(r.w)} × {formatLength(r.h)}, {Math.round(r.w * r.h * 10) / 10} m²
        </p>
      </>
    );
  } else if (selection.part === "wall") {
    const w = plan.walls.find((x) => x.id === selection.id)!;
    title = w.style === "boundary" ? "Boundary" : "Wall";
    body = (
      <Field label="Length (m)">
        <NumberInput value={Math.round(wallLength(w) * 100) / 100} onCommit={(v) => onChange(setWallLength(plan, w.id, v))} />
      </Field>
    );
  } else if (selection.part === "opening") {
    const o = plan.openings.find((x) => x.id === selection.id)!;
    title = o.kind === "door" ? "Door" : "Window";
    body = (
      <>
        <Field label="Width (m)">
          <NumberInput value={o.width} onCommit={(v) => onChange(setOpeningWidth(plan, o.id, v))} />
        </Field>
        <p className="text-[var(--text-muted)]">Drag it to slide it along the wall.</p>
      </>
    );
  } else {
    const it = plan.items.find((x) => x.id === selection.id)!;
    const def = itemDef(it.type);
    title = def?.name ?? "Item";
    body = (
      <>
        {def && <p className="text-[var(--text-muted)]">{formatLength(def.w)} × {formatLength(def.h)}</p>}
        <button onClick={() => onChange(rotateItem(plan, it.id))} className="btn-sos !px-3 !py-1.5 text-[11px] inline-flex items-center gap-2">
          <RotateCw size={13} /> Rotate 90°
        </button>
      </>
    );
  }

  return (
    <section className="space-y-3">
      <PanelTitle>{title}</PanelTitle>
      {body}
      <button onClick={onDelete} className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">
        <Trash2 size={13} /> Delete
      </button>
    </section>
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
function NumberInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }
  const done = () => {
    const v = parseFloat(text.replace(",", "."));
    if (Number.isFinite(v) && v > 0) onCommit(v);
    else setText(String(value));
  };
  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className="plan-ed-input"
    />
  );
}
