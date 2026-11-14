"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Maximize, Minus, Plus, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/utils/supabase/client";
import { EXPERT_TYPES, PLAN_KINDS, itemSize, itemsFor, type ItemDef } from "@/lib/plan/catalog";
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
  setDimension,
  slideOpening,
  startHistory,
  undo,
  type History,
} from "@/lib/plan/edit";
import { examplePlan } from "@/lib/plan/examples";
import { formatArea, formatLength, nearestEnd, nearestWall, projectOnWall, snap, straighten, wallLength } from "@/lib/plan/geometry";
import { GUEST_LIMITS, MEMBER_PERKS, blockedReason, type Countable, type Tier } from "@/lib/plan/limits";
import { deletePlan, listPlans, loadDraft, loadPlan, saveDraft, savePlan, type SavedPlan } from "@/lib/plan/storage";
import type { Plan, PlanKind, Point, Selection } from "@/lib/plan/types";
import Inspector, { NumberInput, PanelTitle } from "./Inspector";
import LibraryPanel, { ITEM_DRAG_TYPE } from "./LibraryPanel";
import PlanDrawing, { type View } from "./PlanDrawing";
import ToolRail, { TOOLS, type Tool } from "./ToolRail";
import { downloadPlanImage } from "./exportPlan";

/**
 * The floorplan sketcher. Anyone can draw; signing in removes the limits
 * (src/lib/plan/limits.ts), opens the full item library and saves plans to
 * the account.
 *
 * Layout: top bar (name, plan kind, history, save) / tool rail / canvas with
 * floating zoom and status bars / properties panel. On phones the rail
 * becomes a dock under the canvas, and the library and properties open as
 * bottom sheets.
 */

const MIN_SCALE = 8;
const MAX_SCALE = 240;
/** Pixels per metre that count as 100% zoom. */
const BASE_SCALE = 60;

type Drag =
  | { kind: "pan"; start: Point; view: View }
  | { kind: "move"; sel: Selection; start: Point; base: Plan }
  | { kind: "slide"; id: string; base: Plan }
  | { kind: "room"; start: Point };

/** A wall length being typed straight onto the canvas. */
interface DimEdit {
  wallId: string;
  x: number;
  y: number;
}

const isPhone = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

export default function PlanEditor() {
  const [history, setHistory] = useState<History>(() => startHistory(examplePlan("interior")));
  const plan = history.present;
  const [preview, setPreview] = useState<Plan | null>(null);
  const shown = preview ?? plan;

  const [tool, setTool] = useState<Tool>("select");
  const [itemType, setItemType] = useState<string>("sofa");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [view, setView] = useState<View>({ scale: BASE_SCALE, ox: 40, oy: 40 });
  const [cursor, setCursor] = useState<Point | null>(null);
  const [chainStart, setChainStart] = useState<Point | null>(null);
  const [roomDraft, setRoomDraft] = useState<{ a: Point; b: Point } | null>(null);
  const [dimEdit, setDimEdit] = useState<DimEdit | null>(null);
  const [dropping, setDropping] = useState(false);
  const [notice, setNotice] = useState<{ text: string; signIn?: boolean } | null>(null);
  // The example plan's ids are random, so wall ids only go into the page after hydration
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
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
    const pad = 56;
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
        const size = itemSize(it);
        if (!size) continue;
        const a = (-it.rotation * Math.PI) / 180;
        const dx = p.x - it.x;
        const dy = p.y - it.y;
        const lx = dx * Math.cos(a) - dy * Math.sin(a);
        const ly = dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(lx) <= size.w / 2 && Math.abs(ly) <= size.h / 2) return { part: "item", id: it.id };
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
    setDimEdit(null);
    setLibraryOpen(t === "item");
    if (t !== "select") setSelection(null);
  }, []);

  /** Places a library piece, if the free limits allow it. */
  const placeItem = useCallback(
    (type: string, at: Point) => {
      if (!allowed("items", 1, type)) return;
      const next = addItem(plan, type, snap(at));
      apply(next);
      setSelection({ part: "item", id: next.items[next.items.length - 1].id });
    },
    [allowed, apply, plan]
  );

  // ---- pointer input -------------------------------------------------------
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    // A length label: type a new length right there
    const label = (e.target as Element).closest?.("[data-wall]");
    if (label && tool === "select" && pointers.current.size === 0) {
      // Stop the browser moving focus to the page, which would close the box at once
      e.preventDefault();
      const box = boxRef.current!.getBoundingClientRect();
      const lr = label.getBoundingClientRect();
      setDimEdit({ wallId: label.getAttribute("data-wall")!, x: lr.left + lr.width / 2 - box.left, y: lr.top + lr.height / 2 - box.top });
      setSelection({ part: "wall", id: label.getAttribute("data-wall")! });
      return;
    }

    const r = svgRef.current!.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    svgRef.current!.setPointerCapture(e.pointerId);
    setDimEdit(null);

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

    if (tool === "item") placeItem(itemType, world);
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

  // Drag and drop from the library (mouse only; touch picks then taps)
  function onDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(ITEM_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropping(true);
  }

  function onDrop(e: React.DragEvent) {
    setDropping(false);
    const type = e.dataTransfer.getData(ITEM_DRAG_TYPE);
    if (!type) return;
    e.preventDefault();
    setItemType(type);
    placeItem(type, toWorld(e.clientX, e.clientY));
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
        setLibraryOpen(false);
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
    else setView({ scale: BASE_SCALE, ox: 40, oy: 40 });
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

  function pickFromLibrary(def: ItemDef) {
    if (tier === "guest" && !def.guest) return setNotice({ text: "Sign in to use the full item library.", signIn: true });
    setItemType(def.type);
    setTool("item");
    // On a phone the sheet covers the plan: close it so the next tap places the piece
    if (isPhone()) {
      setLibraryOpen(false);
      setNotice({ text: `Tap the plan to place the ${def.name.toLowerCase()}.` });
    }
  }

  // ---- derived -------------------------------------------------------------
  const selected = useMemo(() => {
    if (!selection) return null;
    const list = { wall: plan.walls, room: plan.rooms, opening: plan.openings, item: plan.items }[selection.part] as { id: string }[];
    return list.find((x) => x.id === selection.id) ? selection : null;
  }, [plan, selection]);

  const kindInfo = PLAN_KINDS[plan.kind];
  const totalArea = plan.rooms.reduce((sum, r) => sum + r.w * r.h, 0);
  const zoomPct = Math.round((view.scale / BASE_SCALE) * 100);
  const dimWall = dimEdit && plan.walls.find((w) => w.id === dimEdit.wallId);
  // Drawing tools get a one-line reminder on the canvas; Select's tips sit in the side panel
  const hint = !notice && !chainStart && tool !== "select" && tool !== "pan" ? TIPS[tool][0] : null;

  // Wall being drawn
  const wallEnd = chainStart && cursor ? snapPoint(straighten(chainStart, cursor)) : null;
  const sx = (x: number) => x * view.scale + view.ox;
  const sy = (y: number) => y * view.scale + view.oy;

  return (
    <div className="plan-ed flex flex-col h-full text-[var(--text-primary)]">
      {/* ---- top bar ---- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 md:px-5 py-3 border-b border-[var(--border)]">
        <input
          aria-label="Plan name"
          value={plan.name}
          onChange={(e) => apply({ ...plan, name: e.target.value.slice(0, 80) })}
          className="font-editorial text-xl md:text-2xl bg-transparent border-b border-transparent focus:border-[var(--border-strong)] outline-none min-w-0 w-40 md:w-56"
        />
        <div role="radiogroup" aria-label="What are you planning?" className="flex">
          {(Object.keys(PLAN_KINDS) as PlanKind[]).map((k, i) => (
            <button key={k} role="radio" aria-checked={plan.kind === k} onClick={() => changeKind(k)} className={`plan-chip ${i ? "-ml-px" : ""}`}>
              {PLAN_KINDS[k].name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <IconButton label="Undo (Ctrl+Z)" onClick={() => setHistory(undo)} disabled={!history.past.length}><Undo2 size={16} /></IconButton>
          <IconButton label="Redo (Ctrl+Y)" onClick={() => setHistory(redo)} disabled={!history.future.length}><Redo2 size={16} /></IconButton>
          <IconButton label="Download image" onClick={onDownload}><Download size={16} /></IconButton>
          {user ? (
            <button onClick={onSave} disabled={busy} className="plan-btn plan-btn-filled ml-1">
              <Save size={14} /> {savedId ? "Save" : "Save to account"}
            </button>
          ) : (
            <Link href="/login?redirectedFrom=/sketch" className="plan-btn ml-1">
              Sign in to save
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* ---- tools: rail from md up, dock under the canvas on phones ---- */}
        <div className="order-2 md:order-1 md:flex">
          <ToolRail tool={tool} onChoose={chooseTool} />
        </div>

        {/* ---- canvas ---- */}
        <div
          ref={boxRef}
          onDragOver={onDragOver}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
          className={`order-1 md:order-2 relative h-[60svh] md:h-auto md:flex-1 overflow-hidden bg-[var(--bg-base)] ${dropping ? "ring-2 ring-inset ring-[var(--color-orange)]" : ""}`}
        >
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

            <PlanDrawing plan={shown} view={view} selection={selected} editableLengths={mounted && tool === "select"} editingWallId={dimEdit?.wallId} />

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

            {chainStart && <circle cx={sx(chainStart.x)} cy={sy(chainStart.y)} r={5} fill="var(--color-orange)" />}
            {chainStart && wallEnd && (
              <g>
                <line x1={sx(chainStart.x)} y1={sy(chainStart.y)} x2={sx(wallEnd.x)} y2={sy(wallEnd.y)} stroke="var(--color-orange)" strokeWidth={Math.max(3, 0.15 * view.scale)} strokeOpacity={0.7} />
                <text x={sx(wallEnd.x) + 10} y={sy(wallEnd.y) - 10} className="plan-ed-len">
                  {formatLength(Math.hypot(wallEnd.x - chainStart.x, wallEnd.y - chainStart.y))}
                </text>
              </g>
            )}
          </svg>

          {/* typing a length straight onto the plan */}
          {dimEdit && dimWall && (
            <div style={{ left: dimEdit.x, top: dimEdit.y }} className="absolute">
              <NumberInput
                key={dimEdit.wallId}
                autoFocus
                value={Math.round(wallLength(dimWall) * 100) / 100}
                onCommit={(v) => apply(setDimension(plan, dimEdit.wallId, v))}
                onDone={() => setDimEdit(null)}
                className="plan-dim-input"
              />
            </div>
          )}

          {/* library drawer (md up) / sheet (phones) */}
          {libraryOpen && (
            <div className="plan-sheet plan-drawer md:absolute md:left-3 md:top-3 md:bottom-3 md:w-[300px] md:rounded-[var(--plan-radius)] plan-float overflow-hidden z-20">
              <LibraryPanel
                kind={plan.kind}
                locked={(def) => tier === "guest" && !def.guest}
                picked={itemType}
                onPick={pickFromLibrary}
                onClose={() => setLibraryOpen(false)}
              />
            </div>
          )}

          {/* hint or notice, top centre */}
          {(notice || hint) && (
            <div
              role="status"
              className={`absolute left-1/2 -translate-x-1/2 top-3 max-w-[92%] px-3 py-2 plan-float text-xs md:text-sm flex items-center gap-3 ${libraryOpen ? "md:left-[calc(50%+156px)]" : ""}`}
            >
              <span className={notice ? "" : "text-[var(--text-muted)]"}>{notice?.text ?? hint}</span>
              {notice?.signIn && !user && (
                <Link href="/login?redirectedFrom=/sketch" className="font-mono-sos text-[10px] tracking-[0.15em] uppercase text-[var(--color-primary)] whitespace-nowrap">
                  Sign in
                </Link>
              )}
              {notice && <button onClick={() => setNotice(null)} aria-label="Dismiss" className="text-[var(--text-muted)]">×</button>}
            </div>
          )}

          {/* status: scale bar, rooms and area */}
          <div className={`absolute left-3 bottom-3 flex items-center gap-3 px-3 py-2 plan-float font-mono-sos text-[10px] tracking-[0.08em] text-[var(--text-muted)] ${libraryOpen ? "md:hidden" : ""}`}>
            <span className="flex items-end gap-1.5">
              <span className="block h-2 border-x border-b border-[var(--text-muted)]" style={{ width: Math.min(view.scale, 120) }} />
              {view.scale > 120 ? `${Math.round((120 / view.scale) * 100)} cm` : "1 m"}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {plan.rooms.length} {plan.rooms.length === 1 ? "room" : "rooms"} · {formatArea(totalArea)}
            </span>
          </div>

          {/* zoom */}
          <div className="absolute right-3 bottom-3 flex items-center plan-float">
            <IconButton label="Zoom out" onClick={() => zoomBy(1 / 1.25)}><Minus size={15} /></IconButton>
            <button
              onClick={() => setView((v) => ({ ...v, scale: BASE_SCALE }))}
              title="Reset to 100%"
              className="w-12 text-center font-mono-sos text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {zoomPct}%
            </button>
            <IconButton label="Zoom in" onClick={() => zoomBy(1.25)}><Plus size={15} /></IconButton>
            <span className="w-px h-5 bg-[var(--border)]" />
            <IconButton label="Fit plan to screen" onClick={() => fitTo(plan)}><Maximize size={15} /></IconButton>
          </div>

          {chainStart && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-16 md:bottom-3">
              <button onClick={finishChain} className="plan-btn plan-btn-filled">
                Finish wall
              </button>
            </div>
          )}
        </div>

        {/* ---- properties and plan info ---- */}
        <aside className="order-3 md:w-[300px] xl:w-[320px] shrink-0 md:border-l border-[var(--border)] p-3 md:overflow-y-auto space-y-3 text-sm">
          {selected ? (
            <div className="plan-card plan-sheet p-4">
              <Inspector
                plan={plan}
                selection={selected}
                onChange={apply}
                onSelect={setSelection}
                onDelete={deleteSelection}
                onClose={() => setSelection(null)}
              />
            </div>
          ) : (
            <div className="plan-card p-4 hidden md:block">
              <PanelTitle>How to draw</PanelTitle>
              <ul className="space-y-1.5 text-[var(--text-muted)]">
                {TIPS[tool].map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}

          <div className="plan-card p-4" style={{ background: "var(--plan-card-2)" }}>
            <PanelTitle>Who can review this</PanelTitle>
            <p className="text-[var(--text-muted)] mb-3">{kindInfo.hint}.</p>
            <div className="flex flex-wrap gap-1.5">
              {kindInfo.experts.map((x) => (
                <span key={x} className="plan-chip !text-[var(--text-primary)]">{EXPERT_TYPES[x].name}</span>
              ))}
            </div>
            <Link href="/platter" className="plan-btn mt-4">Find an expert →</Link>
          </div>

          {user ? (
            <div className="plan-card p-4">
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
            </div>
          ) : (
            <div className="plan-card p-4">
              <PanelTitle>Free sketcher</PanelTitle>
              <div className="space-y-2.5 mb-4">
                <Meter label="Rooms" used={plan.rooms.length} max={GUEST_LIMITS.rooms} />
                <Meter label="Doors and windows" used={plan.openings.length} max={GUEST_LIMITS.openings} />
                <Meter label="Items" used={plan.items.length} max={GUEST_LIMITS.items} />
              </div>
              <p className="text-[var(--text-muted)] mb-2">Kept in this browser. Signing in adds:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--text-muted)]">
                {MEMBER_PERKS.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <Link href="/login?redirectedFrom=/sketch" className="plan-btn plan-btn-filled mt-4">
                Sign in
              </Link>
            </div>
          )}

          <div className="plan-card p-4">
            <PanelTitle>Start again</PanelTitle>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => startFresh(plan.kind, false)} className="plan-btn">Blank plan</button>
              <button onClick={() => startFresh(plan.kind, true)} className="plan-btn">Example {kindInfo.name.toLowerCase()}</button>
            </div>
          </div>
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
      className={`p-2 ${className} text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}

/** How much of one free limit the plan uses. */
function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between font-mono-sos text-[9px] tracking-[0.15em] uppercase text-[var(--text-muted)] mb-1">
        <span>{label}</span>
        <span>
          {used} / {max}
        </span>
      </div>
      <div className={`plan-meter ${used >= max ? "is-full" : ""}`}>
        <span style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
      </div>
    </div>
  );
}

const TIPS: Record<Tool, string[]> = {
  select: ["Click something to select it, then drag to move it.", "Click any length on the plan to type a new one.", "Drag empty space to move around. Pinch or scroll to zoom.", "Delete removes the selection. Ctrl+Z undoes."],
  room: ["Drag from one corner to the opposite corner.", "The room gets four walls you can add doors and windows to."],
  wall: ["Tap where the wall starts, then where it ends.", "Keep tapping to carry on. Tap the start again, double-tap or press Finish to stop.", "Walls snap straight and join up with nearby ends."],
  door: ["Tap on a wall to add a 90 cm door.", "Select it to change its width or slide it along the wall."],
  window: ["Tap on a wall to add a 1.2 m window.", "Select it to change its width or slide it along the wall."],
  item: ["Drag a piece from the library onto the plan, or pick one and tap.", "Select a piece to resize, rotate or duplicate it."],
  pan: ["Drag to move around the plan. Pinch or scroll to zoom."],
};
