"use client";

import React, { useEffect, useState } from "react";

/**
 * A small apartment floorplan that draws itself: outer walls, inner walls,
 * windows and doors, then room names, a dimension line, and finally an
 * expert's red-pen note. Replays every few seconds. With reduced motion it
 * shows the finished plan.
 *
 * Shown beside "How a Session Works" on the home page.
 */

const CYCLE_MS = 11000;

/** Paths in a 400 × 300 drawing, in the order they are drawn. */
const OUTER = "M40 30 H360 V250 H40 Z";
const INNER = [
  "M210 30 V130",
  "M40 130 H150",
  "M180 130 H360",
  "M270 130 V180",
  "M270 212 V250",
];
const WINDOWS = ["M85 30 H155", "M250 30 H320", "M360 160 V220"];
const DOORS = [
  // gap in the hall wall, swinging into the living room
  "M150 130 A30 30 0 0 0 180 160",
  // bathroom door
  "M270 180 A32 32 0 0 1 302 212",
];

const ROOMS = [
  { x: 40, y: 30, w: 170, h: 100, name: "Bedroom", size: "3.6 × 3.0 m", fill: "var(--field-1)" },
  { x: 210, y: 30, w: 150, h: 100, name: "Kitchen", size: "3.2 × 3.0 m", fill: "var(--field-3)" },
  { x: 40, y: 130, w: 230, h: 120, name: "Living", size: "4.8 × 3.6 m", fill: "var(--field-2)" },
  { x: 270, y: 130, w: 90, h: 120, name: "Bath", size: "1.9 × 3.6 m", fill: "var(--field-4)" },
];

interface FloorplanSketchProps {
  /** True while the plan is on screen: drawing starts fresh each time it appears. */
  playing?: boolean;
  className?: string;
}

export default function FloorplanSketch({ playing = true, className = "" }: FloorplanSketchProps) {
  // Remounting the drawing restarts every CSS animation in it
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const restart = () => setCycle((c) => c + 1);
    const first = setTimeout(restart, 0);
    const id = setInterval(restart, CYCLE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [playing]);


  return (
    <div className={`plan-sketch relative w-[min(440px,82vw)] xl:w-[min(460px,30vw)] pointer-events-none ${className}`} aria-hidden="true">
      <svg key={cycle} viewBox="0 0 400 300" className="w-full h-auto overflow-visible">
        {/* faint drafting grid */}
        <defs>
          <pattern id="plan-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0 H0 V20" fill="none" stroke="var(--border)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="400" height="300" fill="url(#plan-grid)" className="plan-fade" />

        {/* room fills come up under the walls */}
        {ROOMS.map((r, i) => (
          <rect
            key={r.name}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={r.fill}
            className="plan-fill"
            style={{ animationDelay: `${2.4 + i * 0.25}s` }}
          />
        ))}

        {/* walls */}
        <path d={OUTER} pathLength={1} className="plan-line plan-wall-outer" />
        {INNER.map((d, i) => (
          <path key={d} d={d} pathLength={1} className="plan-line plan-wall" style={{ animationDelay: `${1 + i * 0.15}s` }} />
        ))}

        {/* windows: a thin double line in the wall */}
        {WINDOWS.map((d, i) => (
          <path key={d} d={d} pathLength={1} className="plan-line plan-window" style={{ animationDelay: `${1.8 + i * 0.15}s` }} />
        ))}

        {/* door swings */}
        {DOORS.map((d, i) => (
          <path key={d} d={d} pathLength={1} className="plan-line plan-door" style={{ animationDelay: `${2.1 + i * 0.2}s` }} />
        ))}

        {/* room names and sizes */}
        {ROOMS.map((r, i) => (
          <g key={`${r.name}-label`} className="plan-fade" style={{ animationDelay: `${3.2 + i * 0.2}s` }}>
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 2} textAnchor="middle" className="plan-room">
              {r.name}
            </text>
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 12} textAnchor="middle" className="plan-size">
              {r.size}
            </text>
          </g>
        ))}

        {/* overall width */}
        <g className="plan-fade" style={{ animationDelay: "4.2s" }}>
          <path d="M40 272 H360 M40 266 V278 M360 266 V278" className="plan-dim" />
          <text x="200" y="290" textAnchor="middle" className="plan-size">9.6 m</text>
        </g>

        {/* the expert's red-pen note */}
        <circle cx="165" cy="140" r="24" pathLength={1} className="plan-line plan-note" style={{ animationDelay: "5s" }} />
        <path d="M183 122 C 195 70, 215 30, 238 14" pathLength={1} className="plan-line plan-note" style={{ animationDelay: "5.6s" }} />
        <text x="244" y="16" className="plan-note-text plan-fade" style={{ animationDelay: "6s" }}>
          widen to 900?
        </text>
      </svg>
    </div>
  );
}
