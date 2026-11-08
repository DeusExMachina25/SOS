import React from "react";

import { itemDef } from "@/lib/plan/catalog";
import { formatArea, formatLength, pointAt, wallLength } from "@/lib/plan/geometry";
import type { Plan, Point, Selection, Wall } from "@/lib/plan/types";

/**
 * Draws a plan as SVG. World units are metres; `view` turns them into
 * pixels (scale = pixels per metre, ox/oy = where the origin sits).
 * Purely visual: the editor handles all pointer input.
 */

export interface View {
  scale: number;
  ox: number;
  oy: number;
}

const FILLS = ["var(--field-1)", "var(--field-2)", "var(--field-3)", "var(--field-4)"];

interface PlanDrawingProps {
  plan: Plan;
  view: View;
  selection?: Selection | null;
  /** Show every wall's length, not only the selected wall's. */
  showLengths?: boolean;
}

export default function PlanDrawing({ plan, view, selection, showLengths = true }: PlanDrawingProps) {
  const { scale, ox, oy } = view;
  const sx = (x: number) => x * scale + ox;
  const sy = (y: number) => y * scale + oy;
  const wallPx = Math.max(3, 0.15 * scale);
  const isSel = (part: Selection["part"], id: string) => selection?.part === part && selection.id === id;
  const wallById = new Map(plan.walls.map((w) => [w.id, w]));
  const labelled = new Set<string>();

  return (
    <g className="plan-drawing">
      {/* rooms */}
      {plan.rooms.map((r, i) => (
        <rect
          key={r.id}
          x={sx(r.x)}
          y={sy(r.y)}
          width={r.w * scale}
          height={r.h * scale}
          fill={FILLS[i % FILLS.length]}
          fillOpacity={isSel("room", r.id) ? 0.28 : 0.14}
          stroke={isSel("room", r.id) ? "var(--color-orange)" : "none"}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      ))}

      {/* items sit under the walls */}
      {plan.items.map((it) => {
        const def = itemDef(it.type);
        if (!def) return null;
        const w = def.w * scale;
        const h = def.h * scale;
        const sel = isSel("item", it.id);
        const stroke = sel ? "var(--color-orange)" : "var(--text-muted)";
        const showName = Math.min(w, h) > 26 && w > def.name.length * 5.5;
        return (
          <g key={it.id} transform={`translate(${sx(it.x)} ${sy(it.y)}) rotate(${it.rotation})`}>
            {def.shape === "round" ? (
              <ellipse rx={w / 2} ry={h / 2} fill="var(--bg-base)" fillOpacity={0.6} stroke={stroke} strokeWidth={sel ? 2 : 1.2} />
            ) : (
              <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2} fill="var(--bg-base)" fillOpacity={0.6} stroke={stroke} strokeWidth={sel ? 2 : 1.2} />
            )}
            {showName && (
              <text textAnchor="middle" dominantBaseline="central" className="plan-ed-item" transform={`rotate(${-it.rotation})`}>
                {def.name}
              </text>
            )}
          </g>
        );
      })}

      {/* walls */}
      {plan.walls.map((w) => {
        const sel = isSel("wall", w.id);
        const boundary = w.style === "boundary";
        return (
          <line
            key={w.id}
            x1={sx(w.a.x)}
            y1={sy(w.a.y)}
            x2={sx(w.b.x)}
            y2={sy(w.b.y)}
            stroke={sel ? "var(--color-orange)" : "var(--text-primary)"}
            strokeWidth={boundary ? 2 : wallPx}
            strokeDasharray={boundary ? "10 6" : undefined}
            strokeLinecap="square"
          />
        );
      })}

      {/* doors and windows cut into their walls */}
      {plan.openings.map((o) => {
        const w = wallById.get(o.wallId);
        if (!w) return null;
        const len = wallLength(w) || 1;
        const half = Math.min(o.width / len, 1) / 2;
        const a = pointAt(w, Math.max(0, o.t - half));
        const b = pointAt(w, Math.min(1, o.t + half));
        const sel = isSel("opening", o.id);
        const ink = sel ? "var(--color-orange)" : "var(--text-primary)";
        const gap = (
          <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} stroke="var(--bg-base)" strokeWidth={wallPx + 2} />
        );
        if (o.kind === "window") {
          const n = normal(w, wallPx / 2.6 / scale);
          return (
            <g key={o.id}>
              {gap}
              {[1, -1].map((s) => (
                <line
                  key={s}
                  x1={sx(a.x + n.x * s)}
                  y1={sy(a.y + n.y * s)}
                  x2={sx(b.x + n.x * s)}
                  y2={sy(b.y + n.y * s)}
                  stroke={ink}
                  strokeWidth={1.4}
                />
              ))}
              <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} stroke={ink} strokeWidth={0.8} />
            </g>
          );
        }
        // Door: a leaf standing open at 90° and its swing arc
        const width = Math.hypot(b.x - a.x, b.y - a.y);
        const n = normal(w, width);
        const tip = { x: a.x + n.x, y: a.y + n.y };
        const r = width * scale;
        return (
          <g key={o.id}>
            {gap}
            <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(tip.x)} y2={sy(tip.y)} stroke={ink} strokeWidth={1.6} />
            <path
              d={`M${sx(tip.x)} ${sy(tip.y)} A${r} ${r} 0 0 0 ${sx(b.x)} ${sy(b.y)}`}
              fill="none"
              stroke={ink}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </g>
        );
      })}

      {/* wall lengths */}
      {plan.walls.map((w) => {
        if (!(showLengths || isSel("wall", w.id))) return null;
        // Two rooms side by side share a wall line: label it once
        const key = [w.a, w.b].map((p) => `${p.x},${p.y}`).sort().join("|");
        if (labelled.has(key) && !isSel("wall", w.id)) return null;
        labelled.add(key);
        const len = wallLength(w);
        if (len * scale < 46) return null;
        const mid = pointAt(w, 0.5);
        const n = normal(w, (wallPx / 2 + 10) / scale);
        const angle = (Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI;
        const upright = angle > 90 || angle < -90 ? angle + 180 : angle;
        const x = sx(mid.x - n.x);
        const y = sy(mid.y - n.y);
        return (
          <text key={`len-${w.id}`} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="plan-ed-len" transform={`rotate(${upright} ${x} ${y})`}>
            {formatLength(len)}
          </text>
        );
      })}

      {/* room names on top of everything */}
      {plan.rooms.map((r) => {
        if (r.w * scale < 50 || r.h * scale < 34) return null;
        const cx = sx(r.x + r.w / 2);
        const cy = sy(r.y + r.h / 2);
        return (
          <g key={`label-${r.id}`}>
            <text x={cx} y={cy - 6} textAnchor="middle" className="plan-ed-room">
              {r.name}
            </text>
            <text x={cx} y={cy + 9} textAnchor="middle" className="plan-ed-size">
              {formatLength(r.w)} × {formatLength(r.h)} · {formatArea(r.w * r.h)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A vector at right angles to the wall, `len` metres long. */
function normal(w: Wall, len: number): Point {
  const dx = w.b.x - w.a.x;
  const dy = w.b.y - w.a.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: (-dy / l) * len, y: (dx / l) * len };
}

