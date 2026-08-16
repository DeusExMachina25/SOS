"use client";

import React, { useEffect, useMemo, useState } from "react";

export type FieldKey = "architecture" | "fashion" | "travel";

export interface PieExpert {
  id: string;
  full_name: string;
  expert_role?: string;
  bio?: string;
  field?: FieldKey;
  site?: string;
}

interface FieldPieProps {
  experts: PieExpert[];
  selectedExpertId: string;
  onSelect: (id: string) => void;
}

const FIELDS: { key: FieldKey; name: string; cssVar: string; tagline: string }[] = [
  { key: "architecture", name: "Architecture", cssVar: "--color-primary", tagline: "Space, structure, material" },
  { key: "fashion", name: "Fashion", cssVar: "--color-orange", tagline: "Brand, collection, direction" },
  { key: "travel", name: "Travel", cssVar: "--color-green", tagline: "Route, pacing, logistics" },
];

/* Light-theme values, used for the server render before the real tokens resolve. */
const FALLBACK_PALETTE = ["#30009C", "#FF5B2E", "#8B9E30"];

const CX = 230;
const CY = 138;
const R = 152;
const TILT = 0.44;
const DEPTH = 30;
const SLICE = 360 / FIELDS.length;

/* ── colour helpers ─────────────────────────────────────── */

function toRGB(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function shade(hex: string, f: number): string {
  const [r, g, b] = toRGB(hex);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/* Deterministic duotone stand-in until real headshots exist. */
function placeholderPhoto(hex: string, seed: number): string {
  const [r, g, b] = toRGB(hex);
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const deep = `rgb(${Math.round(r * 0.22)},${Math.round(g * 0.2)},${Math.round(b * 0.28)})`;
  let shapes = "";
  for (let k = 0; k < 5; k++) {
    const cx = 20 + rnd() * 260;
    const cy = 20 + rnd() * 400;
    const rx = 90 + rnd() * 150;
    const ry = 90 + rnd() * 170;
    const op = (0.16 + rnd() * 0.34).toFixed(2);
    shapes +=
      `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}"` +
      ` fill="${shade(hex, 0.55 + rnd() * 0.75)}" opacity="${op}"/>`;
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="440" viewBox="0 0 300 440">` +
    `<rect width="300" height="440" fill="${deep}"/>` +
    `<g filter="url(#f)">${shapes}</g>` +
    `<defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feGaussianBlur stdDeviation="34"/></filter></defs></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* ── projection ─────────────────────────────────────────── */

/** Ground point (x, y) raised to height z, projected onto the tilted plane. */
function p3(x: number, y: number, z: number): [number, number] {
  return [CX + x, CY + y * TILT - z];
}
function onRim(r: number, deg: number, yOff = 0): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * TILT * Math.sin(a) + yOff];
}
const a0Of = (i: number) => -90 + i * SLICE;
const a1Of = (i: number) => -90 + (i + 1) * SLICE;
const midOf = (i: number) => a0Of(i) + SLICE / 2;

function topFace(i: number): string {
  const [x0, y0] = onRim(R, a0Of(i));
  const [x1, y1] = onRim(R, a1Of(i));
  return `M${CX},${CY} L${x0},${y0} A${R},${R * TILT} 0 0 1 ${x1},${y1} Z`;
}

/** Extruded wall for only the viewer-facing part of the arc. */
function frontWall(i: number): string | null {
  const vis: number[] = [];
  for (let a = a0Of(i); a <= a1Of(i); a += 2) {
    const norm = ((a % 360) + 360) % 360;
    if (Math.sin((norm * Math.PI) / 180) > 0) vis.push(a);
  }
  if (vis.length < 2) return null;
  let d = "";
  vis.forEach((a, k) => {
    const [x, y] = onRim(R, a);
    d += `${k === 0 ? "M" : "L"}${x},${y} `;
  });
  for (let k = vis.length - 1; k >= 0; k--) {
    const [x, y] = onRim(R, vis[k], DEPTH);
    d += `L${x},${y} `;
  }
  return `${d}Z`;
}

/* ── isometric models, sharing the pie's own projection ─── */

function facePath(pts: [number, number][]): string {
  return `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")} Z`;
}

function IsoBox({ ox, oy, w, d, h, base }: { ox: number; oy: number; w: number; d: number; h: number; base: string }) {
  const x0 = ox - w / 2;
  const x1 = ox + w / 2;
  const y0 = oy - d / 2;
  const y1 = oy + d / 2;
  return (
    <>
      <path d={facePath([p3(x1, y1, 0), p3(x1, y0, 0), p3(x1, y0, h), p3(x1, y1, h)])} fill={shade(base, 0.55)} />
      <path d={facePath([p3(x0, y1, 0), p3(x1, y1, 0), p3(x1, y1, h), p3(x0, y1, h)])} fill={shade(base, 0.82)} />
      <path d={facePath([p3(x0, y0, h), p3(x1, y0, h), p3(x1, y1, h), p3(x0, y1, h)])} fill={shade(base, 1.2)} />
    </>
  );
}

function Windows({ ox, oy, w, d, h, base, seed }: { ox: number; oy: number; w: number; d: number; h: number; base: string; seed: number }) {
  const y = oy + d / 2;
  const cols = w > 13 ? 3 : 2;
  const rows = Math.max(2, Math.floor((h - 10) / 8));
  const ww = w / (cols * 2 + 1);
  const wh = 3.4;
  const out: React.ReactElement[] = [];
  let k = seed;
  for (let c = 0; c < cols; c++) {
    for (let ri = 0; ri < rows; ri++) {
      const z = 6 + ri * 8;
      if (z + wh > h - 3) continue;
      const x = ox - w / 2 + ww * (c * 2 + 1);
      k = (k * 9301 + 49297) % 233280;
      out.push(
        <path
          key={`${c}-${ri}`}
          className="fp-win"
          style={{ animationDelay: `${((k / 233280) * 5).toFixed(2)}s` }}
          d={facePath([p3(x, y, z), p3(x + ww, y, z), p3(x + ww, y, z + wh), p3(x, y, z + wh)])}
          fill={shade(base, 1.55)}
        />
      );
    }
  }
  return <>{out}</>;
}

function IsoCylinder({ ox, oy, r, h, base, bands }: { ox: number; oy: number; r: number; h: number; base: string; bands?: boolean }) {
  const ry = +(r * TILT).toFixed(1);
  const lb = p3(ox - r, oy, 0);
  const rb = p3(ox + r, oy, 0);
  const lt = p3(ox - r, oy, h);
  const rt = p3(ox + r, oy, h);
  const cap = p3(ox, oy, h);
  return (
    <>
      <path
        d={
          `M${lt[0].toFixed(1)},${lt[1].toFixed(1)} L${lb[0].toFixed(1)},${lb[1].toFixed(1)} ` +
          `A${r},${ry} 0 0 0 ${rb[0].toFixed(1)},${rb[1].toFixed(1)} ` +
          `L${rt[0].toFixed(1)},${rt[1].toFixed(1)} ` +
          `A${r},${ry} 0 0 1 ${lt[0].toFixed(1)},${lt[1].toFixed(1)} Z`
        }
        fill={shade(base, 0.7)}
      />
      {bands &&
        [0, 1, 2].map((b) => {
          const z = h * (0.24 + b * 0.24);
          const a = p3(ox - r, oy, z);
          const c = p3(ox + r, oy, z);
          return (
            <path
              key={b}
              className="fp-band"
              style={{ animationDelay: `${(b * 2.3).toFixed(1)}s` }}
              d={`M${a[0].toFixed(1)},${a[1].toFixed(1)} A${r},${ry} 0 0 0 ${c[0].toFixed(1)},${c[1].toFixed(1)}`}
              fill="none"
              stroke={shade(base, 1.3)}
              strokeWidth="1.1"
            />
          );
        })}
      <ellipse cx={cap[0].toFixed(1)} cy={cap[1].toFixed(1)} rx={r} ry={ry} fill={shade(base, 1.22)} />
      <ellipse cx={cap[0].toFixed(1)} cy={cap[1].toFixed(1)} rx={(r * 0.4).toFixed(1)} ry={(ry * 0.4).toFixed(1)} fill={shade(base, 0.82)} />
    </>
  );
}

function GroundShadow({ ox, oy, r, op }: { ox: number; oy: number; r: number; op: number }) {
  const c = p3(ox, oy, 0);
  return <ellipse className="fp-shadow" cx={c[0].toFixed(1)} cy={c[1].toFixed(1)} rx={r} ry={(r * TILT).toFixed(1)} fill={`rgba(0,0,0,${op})`} />;
}

function Model({ field, ox, oy, base }: { field: FieldKey; ox: number; oy: number; base: string }) {
  if (field === "architecture") {
    const towers = [
      { x: ox - 15, y: oy - 6, w: 14, d: 14, h: 34, seed: 7 },
      { x: ox + 14, y: oy - 9, w: 12, d: 12, h: 25, seed: 19 },
      { x: ox, y: oy + 6, w: 16, d: 16, h: 52, seed: 31 },
    ];
    const mast = p3(ox, oy + 6, 52);
    const tip = p3(ox, oy + 6, 62);
    return (
      <>
        <GroundShadow ox={ox + 1} oy={oy + 3} r={28} op={0.22} />
        {towers.map((t, k) => (
          <React.Fragment key={k}>
            <IsoBox ox={t.x} oy={t.y} w={t.w} d={t.d} h={t.h} base={base} />
            <Windows ox={t.x} oy={t.y} w={t.w} d={t.d} h={t.h} base={base} seed={t.seed} />
          </React.Fragment>
        ))}
        <line x1={mast[0]} y1={mast[1]} x2={tip[0]} y2={tip[1]} stroke={shade(base, 1.3)} strokeWidth="1.4" strokeLinecap="round" />
        <circle className="fp-halo" cx={tip[0]} cy={tip[1]} r="3" fill="none" stroke={shade(base, 1.5)} strokeWidth="1.1" />
        <circle className="fp-beacon" cx={tip[0]} cy={tip[1]} r="2.6" fill={shade(base, 1.6)} />
      </>
    );
  }

  if (field === "fashion") {
    const pinB = p3(ox + 17, oy - 7, 0);
    const pinT = p3(ox + 17, oy - 7, 38);
    const tA = p3(ox + 8, oy + 3, 29);
    const tB = p3(ox + 17, oy - 7, 36);
    return (
      <>
        <GroundShadow ox={ox + 2} oy={oy + 2} r={26} op={0.22} />
        <line x1={pinB[0]} y1={pinB[1]} x2={pinT[0]} y2={pinT[1]} stroke={shade(base, 1.25)} strokeWidth="1.7" strokeLinecap="round" />
        <IsoCylinder ox={ox - 3} oy={oy + 3} r={16} h={17} base={base} bands />
        <IsoCylinder ox={ox - 3} oy={oy + 3} r={11} h={30} base={base} bands />
        <path
          className="fp-thread"
          d={`M${tA[0].toFixed(1)},${tA[1].toFixed(1)} Q${((tA[0] + tB[0]) / 2).toFixed(1)},${(Math.min(tA[1], tB[1]) - 7).toFixed(1)} ${tB[0].toFixed(1)},${tB[1].toFixed(1)}`}
          fill="none"
          stroke={shade(base, 1.4)}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle className="fp-glint" cx={pinT[0]} cy={pinT[1]} r="3.6" fill={shade(base, 1.6)} />
      </>
    );
  }

  /* travel — a paper dart riding above a marker post */
  const anchor = p3(ox + 2, oy, 50);
  const at = (p: [number, number]) => [anchor[0] + p[0], anchor[1] + p[1]] as [number, number];
  return (
    <>
      <GroundShadow ox={ox + 2} oy={oy} r={14} op={0.17} />
      <IsoCylinder ox={ox - 18} oy={oy + 7} r={7} h={10} base={base} />
      <path
        className="fp-trail"
        d={`M${(anchor[0] - 26).toFixed(1)},${(anchor[1] + 16).toFixed(1)} Q${(anchor[0] - 18).toFixed(1)},${(anchor[1] + 3).toFixed(1)} ${(anchor[0] - 6).toFixed(1)},${(anchor[1] + 6).toFixed(1)}`}
        fill="none"
        stroke={shade(base, 1.3)}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path d={facePath([at([23, -6]), at([-18, 5]), at([-2, 9])])} fill={shade(base, 1.3)} />
      <path d={facePath([at([23, -6]), at([-2, 9]), at([-10, 18])])} fill={shade(base, 0.62)} />
    </>
  );
}

/* ── component ──────────────────────────────────────────── */

export default function FieldPie({ experts, selectedExpertId, onSelect }: FieldPieProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [openField, setOpenField] = useState<number | null>(null);
  const [palette, setPalette] = useState<string[]>(FALLBACK_PALETTE);

  /* Resolve the real design tokens once mounted, and follow theme changes. */
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setPalette(FIELDS.map((f) => cs.getPropertyValue(f.cssVar).trim() || "#888888"));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", read);
    };
  }, []);

  const byField = useMemo(() => {
    const map = new Map<FieldKey, PieExpert[]>();
    FIELDS.forEach((f) => map.set(f.key, []));
    experts.forEach((e) => {
      const key: FieldKey = e.field ?? "architecture";
      map.get(key)?.push(e);
    });
    return map;
  }, [experts]);

  const focus = openField ?? hovered;

  /* Back-to-front so the near slice overlaps the far ones. */
  const drawOrder = useMemo(
    () =>
      FIELDS.map((_, i) => i).sort(
        (a, b) => Math.sin((midOf(a) * Math.PI) / 180) - Math.sin((midOf(b) * Math.PI) / 180)
      ),
    []
  );

  const openExperts = openField !== null ? byField.get(FIELDS[openField].key) ?? [] : [];

  return (
    <div className="w-full flex flex-col items-center mb-12">
      <div className="relative w-full max-w-[520px]" onMouseLeave={() => setHovered(null)}>
        <svg viewBox="0 0 460 320" className="w-full block overflow-visible" role="img" aria-label="Field selector">
          {drawOrder.map((i) => {
            const base = palette[i];
            const wall = frontWall(i);
            const mid = (midOf(i) * Math.PI) / 180;
            const cr = R * 0.5;
            const ox = Math.cos(mid) * cr;
            const oy = Math.sin(mid) * cr;
            const on = i === focus;
            const pull = on ? (openField === i ? 26 : 9) : 0;
            const dx = Math.cos(mid) * pull;
            const dy = Math.sin(mid) * TILT * pull - (openField === i ? 6 : 0);
            const rise = on ? (openField === i ? 16 : 7) : 0;

            return (
              <g
                key={FIELDS[i].key}
                className={`fp-slice${on ? " fp-awake" : ""}`}
                style={{
                  transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`,
                  opacity: focus !== null && !on ? 0.22 : 1,
                }}
                onMouseEnter={() => setHovered(i)}
                onClick={() => setOpenField(openField === i ? null : i)}
              >
                {wall && <path d={wall} fill={shade(base, 0.6)} />}
                <path d={topFace(i)} fill={base} stroke="var(--bg-base)" strokeWidth="2" />
                <g className="fp-lift" style={{ transform: `translateY(-${rise}px)` }}>
                  <g className={`fp-bob${FIELDS[i].key === "travel" ? " fp-drift" : ""}`} style={{ animationDelay: `${(i * 0.7).toFixed(1)}s` }}>
                    <Model field={FIELDS[i].key} ox={ox} oy={oy} base={base} />
                  </g>
                </g>
              </g>
            );
          })}

          {FIELDS.map((f, i) => {
            const [lx, ly] = onRim(R + 46, midOf(i));
            const on = i === focus;
            return (
              <text
                key={f.key}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-inter pointer-events-none"
                style={{
                  fontSize: 13,
                  fill: on ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: on ? 600 : 400,
                  opacity: focus !== null && !on ? 0.3 : 1,
                  transition: "fill 0.4s, opacity 0.45s",
                }}
              >
                {f.name}
              </text>
            );
          })}
        </svg>
      </div>

      {/* caption — blank until a slice takes focus */}
      <div className="text-center mt-6 min-h-[56px]">
        {focus !== null && (
          <>
            <div
              className="font-mono-sos text-[10px] tracking-[0.14em]"
              style={{ color: `var(${FIELDS[focus].cssVar})` }}
            >
              {FIELDS[focus].tagline}
            </div>
            <div
              className="font-editorial text-[27px] leading-tight mt-1"
              style={{ color: `var(${FIELDS[focus].cssVar})` }}
            >
              {FIELDS[focus].name}
            </div>
          </>
        )}
      </div>

      {/* expert cards for the open field */}
      {openField !== null && (
        <div className="w-full mt-8">
          <div className="flex items-center justify-between gap-4 pb-3 mb-6 border-b border-[var(--border-strong)]">
            <div>
              <div className="font-editorial text-xl text-[var(--text-primary)]">{FIELDS[openField].name}</div>
              <div className="font-mono-sos text-[10px] text-[var(--text-muted)] mt-1">
                {openExperts.length} {openExperts.length === 1 ? "expert" : "experts"} available
              </div>
            </div>
            <button
              onClick={() => setOpenField(null)}
              className="font-mono-sos text-[10px] text-[var(--text-muted)] border border-[var(--border-strong)] rounded-full px-4 py-1.5 hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
            >
              All fields
            </button>
          </div>

          {openExperts.length === 0 ? (
            <p className="font-inter text-sm text-[var(--text-muted)] text-center py-10">
              No experts listed in this field yet.
            </p>
          ) : (
            <div
              className="grid gap-4 justify-center"
              style={{ gridTemplateColumns: `repeat(${Math.min(openExperts.length, 3)}, minmax(0, 1fr))` }}
            >
              {openExperts.map((e, k) => {
                const accent = `var(${FIELDS[openField].cssVar})`;
                const isActive = e.id === selectedExpertId;
                return (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e.id)}
                    className={`fp-card relative h-[430px] rounded-[22px] overflow-hidden text-left cursor-pointer transition-[opacity,transform,box-shadow] ${
                      isActive ? "ring-1 ring-[var(--text-primary)]" : ""
                    }`}
                    style={{
                      backgroundImage: placeholderPhoto(palette[openField], k + FIELDS[openField].name.length),
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      animationDelay: `${(k * 0.11).toFixed(2)}s`,
                    }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-t from-[rgba(6,4,14,0.92)] via-[rgba(6,4,14,0.5)] to-[rgba(6,4,14,0.05)]" />
                    <span className="absolute left-0 right-0 bottom-0 p-6 pr-16 block">
                      <span className="block font-mono-sos text-[10px] mb-2" style={{ color: accent }}>
                        {e.expert_role}
                      </span>
                      <span className="block font-editorial text-2xl leading-tight text-white mb-2">{e.full_name}</span>
                      <span className="block font-inter text-[12.5px] leading-relaxed text-white/70 line-clamp-3">{e.bio}</span>
                    </span>
                    {e.site && (
                      <a
                        href={e.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        aria-label={`Visit ${e.full_name}'s site`}
                        className="absolute right-5 bottom-5 w-10 h-10 rounded-full border border-white/40 bg-white/10 text-white flex items-center justify-center hover:bg-white hover:text-[#14101f] transition-colors"
                      >
                        ↗
                      </a>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
