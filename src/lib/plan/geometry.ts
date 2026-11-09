import type { Point, Wall } from "./types";

/** Drawing snaps to a 10 cm grid. */
export const GRID_M = 0.1;

export function round(n: number, step = GRID_M): number {
  // Rounding to whole centimetres first keeps 0.30000000000000004 out of the data
  return Math.round(Math.round(n / step) * step * 100) / 100;
}

export function snap(p: Point, step = GRID_M): Point {
  return { x: round(p.x, step), y: round(p.y, step) };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function wallLength(w: Wall): number {
  return distance(w.a, w.b);
}

/**
 * Keeps a wall straight: if it is within 8° of horizontal or vertical, it is
 * made exactly so.
 */
export function straighten(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  const nearHorizontal = angle < 8 || angle > 172;
  const nearVertical = Math.abs(angle - 90) < 8;
  if (nearHorizontal) return { x: to.x, y: from.y };
  if (nearVertical) return { x: from.x, y: to.y };
  return to;
}

/** The closest wall end within `reach` metres, so walls join up cleanly. */
export function nearestEnd(p: Point, walls: Wall[], reach: number): Point | null {
  let best: Point | null = null;
  let bestD = reach;
  for (const w of walls) {
    for (const end of [w.a, w.b]) {
      const d = distance(p, end);
      if (d <= bestD) {
        best = end;
        bestD = d;
      }
    }
  }
  return best;
}

/** Where `p` falls along wall `w`: t from 0 to 1, and how far away it is. */
export function projectOnWall(p: Point, w: Wall): { t: number; dist: number; point: Point } {
  const dx = w.b.x - w.a.x;
  const dy = w.b.y - w.a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - w.a.x) * dx + (p.y - w.a.y) * dy) / len2));
  const point = { x: w.a.x + dx * t, y: w.a.y + dy * t };
  return { t, dist: distance(p, point), point };
}

/** The wall nearest to `p` within `reach` metres. */
export function nearestWall(p: Point, walls: Wall[], reach: number): { wall: Wall; t: number } | null {
  let best: { wall: Wall; t: number } | null = null;
  let bestD = reach;
  for (const w of walls) {
    const hit = projectOnWall(p, w);
    if (hit.dist <= bestD) {
      best = { wall: w, t: hit.t };
      bestD = hit.dist;
    }
  }
  return best;
}

export function pointAt(w: Wall, t: number): Point {
  return { x: w.a.x + (w.b.x - w.a.x) * t, y: w.a.y + (w.b.y - w.a.y) * t };
}

/** "3.6 m", "45 cm". */
export function formatLength(m: number): string {
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${(Math.round(m * 100) / 100).toFixed(m < 10 ? 2 : 1).replace(/\.?0+$/, "")} m`;
}

/** "12.4 m²". */
export function formatArea(m2: number): string {
  return `${(Math.round(m2 * 10) / 10).toString()} m²`;
}
