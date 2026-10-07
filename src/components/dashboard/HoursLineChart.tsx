"use client";

import { useId } from "react";

/** Seven-point hours line chart. Axis labels live inside the SVG so they stay under their points at any width. */
export default function HoursLineChart({ data, days }: { data: number[]; days: string[] }) {
  const gradId = useId();

  const max = Math.max(...data, 1);
  const width = 320;
  const plotAreaHeight = 110;
  const labelBand = 16;
  const height = plotAreaHeight + labelBand;
  const padding = 15;
  const plotWidth = width - padding * 2;
  const plotHeight = plotAreaHeight - padding * 2;
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const pts = data.map((val, i) => ({
    x: padding + i * step,
    y: padding + plotHeight - (val / max) * plotHeight,
  }));

  const pathData = pts.length ? `M ${pts.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
  const baseY = plotAreaHeight - padding;
  const areaData = pts.length
    ? `${pathData} L ${pts[pts.length - 1].x},${baseY} L ${pts[0].x},${baseY} Z`
    : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center text-[9px] font-mono-sos text-[var(--text-faint)] tracking-widest uppercase">
        <span>Last 7 Days (hrs)</span>
        <span>Peak: {Math.max(...data, 0).toFixed(1)}h</span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible w-full"
        role="img"
        aria-label={`Hours consulted over the last ${data.length} days`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-orange)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-orange)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + ratio * plotHeight;
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="2,4"
            />
          );
        })}

        <path d={areaData} fill={`url(#${gradId})`} />
        <path
          d={pathData}
          fill="none"
          stroke="var(--color-orange)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0px 3px 6px color-mix(in srgb, var(--color-orange) 30%, transparent))" }}
        />

        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--bg-base)" stroke="var(--color-orange)" strokeWidth="2.5" />
            <text
              x={p.x}
              y={plotAreaHeight + 8}
              textAnchor="middle"
              fontSize="8"
              letterSpacing="0.8"
              fill="var(--text-muted)"
              className="font-mono-sos"
            >
              {days[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
