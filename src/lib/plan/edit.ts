import { round } from "./geometry";
import type { Item, Opening, Plan, Point, Room, Selection, Wall } from "./types";

/**
 * Every change to a plan, as plain functions that return a new plan. The
 * editor only ever calls these, so they are easy to test and to undo.
 */

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addWall(plan: Plan, a: Point, b: Point, style: Wall["style"] = "wall"): Plan {
  if (a.x === b.x && a.y === b.y) return plan;
  return { ...plan, walls: [...plan.walls, { id: newId("w"), a, b, style }] };
}

/** A rectangular room plus its four walls. Corners in any order. */
export function addRoom(plan: Plan, p: Point, q: Point, name: string): Plan {
  const x = Math.min(p.x, q.x);
  const y = Math.min(p.y, q.y);
  const w = round(Math.abs(q.x - p.x));
  const h = round(Math.abs(q.y - p.y));
  if (w < 0.5 || h < 0.5) return plan;
  const corners = [
    { x, y },
    { x: round(x + w), y },
    { x: round(x + w), y: round(y + h) },
    { x, y: round(y + h) },
  ];
  const walls: Wall[] = corners.map((c, i) => ({ id: newId("w"), a: c, b: corners[(i + 1) % 4], style: "wall" }));
  const room: Room = { id: newId("r"), name, x, y, w, h, wallIds: walls.map((wl) => wl.id) };
  return { ...plan, rooms: [...plan.rooms, room], walls: [...plan.walls, ...walls] };
}

export function addOpening(plan: Plan, kind: Opening["kind"], wallId: string, t: number): Plan {
  const width = kind === "door" ? 0.9 : 1.2;
  return { ...plan, openings: [...plan.openings, { id: newId("o"), kind, wallId, t, width }] };
}

export function addItem(plan: Plan, type: string, at: Point): Plan {
  const item: Item = { id: newId("i"), type, x: at.x, y: at.y, rotation: 0 };
  return { ...plan, items: [...plan.items, item] };
}

const shift = (p: Point, dx: number, dy: number): Point => ({ x: round(p.x + dx), y: round(p.y + dy) });

export function move(plan: Plan, sel: Selection, dx: number, dy: number): Plan {
  switch (sel.part) {
    case "wall":
      return {
        ...plan,
        walls: plan.walls.map((w) => (w.id === sel.id ? { ...w, a: shift(w.a, dx, dy), b: shift(w.b, dx, dy) } : w)),
      };
    case "room": {
      const room = plan.rooms.find((r) => r.id === sel.id);
      if (!room) return plan;
      const own = new Set(room.wallIds);
      return {
        ...plan,
        rooms: plan.rooms.map((r) => (r.id === sel.id ? { ...r, x: round(r.x + dx), y: round(r.y + dy) } : r)),
        walls: plan.walls.map((w) => (own.has(w.id) ? { ...w, a: shift(w.a, dx, dy), b: shift(w.b, dx, dy) } : w)),
      };
    }
    case "item":
      return {
        ...plan,
        items: plan.items.map((i) => (i.id === sel.id ? { ...i, x: round(i.x + dx), y: round(i.y + dy) } : i)),
      };
    case "opening":
      return plan; // openings slide along their wall: see slideOpening
  }
}

export function slideOpening(plan: Plan, id: string, t: number): Plan {
  return { ...plan, openings: plan.openings.map((o) => (o.id === id ? { ...o, t: Math.max(0, Math.min(1, t)) } : o)) };
}

export function remove(plan: Plan, sel: Selection): Plan {
  switch (sel.part) {
    case "wall":
      return {
        ...plan,
        walls: plan.walls.filter((w) => w.id !== sel.id),
        openings: plan.openings.filter((o) => o.wallId !== sel.id),
        rooms: plan.rooms.map((r) => ({ ...r, wallIds: r.wallIds.filter((id) => id !== sel.id) })),
      };
    case "room": {
      const room = plan.rooms.find((r) => r.id === sel.id);
      const own = new Set(room?.wallIds ?? []);
      return {
        ...plan,
        rooms: plan.rooms.filter((r) => r.id !== sel.id),
        walls: plan.walls.filter((w) => !own.has(w.id)),
        openings: plan.openings.filter((o) => !own.has(o.wallId)),
      };
    }
    case "opening":
      return { ...plan, openings: plan.openings.filter((o) => o.id !== sel.id) };
    case "item":
      return { ...plan, items: plan.items.filter((i) => i.id !== sel.id) };
  }
}

export function renameRoom(plan: Plan, id: string, name: string): Plan {
  return { ...plan, rooms: plan.rooms.map((r) => (r.id === id ? { ...r, name: name.slice(0, 40) } : r)) };
}

export function setOpeningWidth(plan: Plan, id: string, width: number): Plan {
  const w = Math.max(0.3, Math.min(6, round(width)));
  return { ...plan, openings: plan.openings.map((o) => (o.id === id ? { ...o, width: w } : o)) };
}

export function rotateItem(plan: Plan, id: string, by = 90): Plan {
  return { ...plan, items: plan.items.map((i) => (i.id === id ? { ...i, rotation: (i.rotation + by + 360) % 360 } : i)) };
}

/** Sets a wall's length, keeping its first end where it is. */
export function setWallLength(plan: Plan, id: string, length: number): Plan {
  const len = Math.max(0.1, Math.min(200, round(length)));
  return {
    ...plan,
    walls: plan.walls.map((w) => {
      if (w.id !== id) return w;
      const dx = w.b.x - w.a.x;
      const dy = w.b.y - w.a.y;
      const cur = Math.hypot(dx, dy) || 1;
      return { ...w, b: { x: round(w.a.x + (dx / cur) * len), y: round(w.a.y + (dy / cur) * len) } };
    }),
  };
}

/** Bounding box of everything drawn, in metres, or null for an empty plan. */
export function bounds(plan: Plan): { x: number; y: number; w: number; h: number } | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const w of plan.walls) {
    xs.push(w.a.x, w.b.x);
    ys.push(w.a.y, w.b.y);
  }
  for (const i of plan.items) {
    xs.push(i.x - 1, i.x + 1);
    ys.push(i.y - 1, i.y + 1);
  }
  if (!xs.length) return null;
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// ---------------------------------------------------------------------------
// Undo and redo

export interface History {
  past: Plan[];
  present: Plan;
  future: Plan[];
}

const MAX_UNDO = 100;

export function startHistory(plan: Plan): History {
  return { past: [], present: plan, future: [] };
}

export function commit(h: History, next: Plan): History {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-MAX_UNDO), present: next, future: [] };
}

export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
