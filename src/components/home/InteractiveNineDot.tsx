"use client";

import React, { useState, useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface Dot {
  id: number;
  x: number;
  y: number;
  label: string;
}

export default function InteractiveNineDot() {
  const [points, setPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [solved, setSolved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Define the 9 dots centered in a 400x400 canvas
  const dots: Dot[] = [
    { id: 1, x: 120, y: 120, label: "A1" },
    { id: 2, x: 200, y: 120, label: "A2" },
    { id: 3, x: 280, y: 120, label: "A3" },
    { id: 4, x: 120, y: 200, label: "B1" },
    { id: 5, x: 200, y: 200, label: "B2" },
    { id: 6, x: 280, y: 200, label: "B3" },
    { id: 7, x: 120, y: 280, label: "C1" },
    { id: 8, x: 200, y: 280, label: "C2" },
    { id: 9, x: 280, y: 280, label: "C3" },
  ];

  // Helper to calculate distance from a point to a line segment
  const getDistanceToSegment = (p: Point, a: Point, b: Point) => {
    const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
  };

  // Determine which dots are connected by the current path
  const getConnectedDots = () => {
    const connected = new Set<number>();
    
    // Check if path is empty
    if (points.length === 0) return connected;

    dots.forEach((dot) => {
      // 1. Direct hit on any point in the path (snapped or close)
      const hasDirectHit = points.some(p => Math.hypot(p.x - dot.x, p.y - dot.y) < 10);
      if (hasDirectHit) {
        connected.add(dot.id);
        return;
      }

      // 2. Intersected by any line segment in the path
      for (let i = 0; i < points.length - 1; i++) {
        const dist = getDistanceToSegment(dot, points[i], points[i + 1]);
        if (dist <= 12) { // 12px tolerance for line crossing
          connected.add(dot.id);
          break;
        }
      }
    });

    return connected;
  };

  const connectedDots = getConnectedDots();
  const lineCount = points.length > 1 ? points.length - 1 : 0;

  // Handle canvas click to place a new point
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (solved) return;

    if (containerRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // Coordinate scaling matching viewbox (0 0 400 400)
      const scaleX = 400 / rect.width;
      const scaleY = 400 / rect.height;
      const x = rawX * scaleX;
      const y = rawY * scaleY;

      let targetPoint: Point = { x, y };

      // Snap to nearest dot if close (within 24px)
      const snapThreshold = 24;
      let snappedDot: Dot | null = null;
      let minDistance = Infinity;

      dots.forEach((dot) => {
        const dist = Math.hypot(x - dot.x, y - dot.y);
        if (dist < snapThreshold && dist < minDistance) {
          minDistance = dist;
          snappedDot = dot;
        }
      });

      if (snappedDot) {
        targetPoint = { x: (snappedDot as Dot).x, y: (snappedDot as Dot).y };
      }

      const newPoints = [...points, targetPoint];
      setPoints(newPoints);
      setErrorMsg(null);
    }
  };

  // Track mouse movement for drawing preview line
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0 || solved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const scaleX = 400 / rect.width;
    const scaleY = 400 / rect.height;
    setMousePos({
      x: rawX * scaleX,
      y: rawY * scaleY
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Reset the puzzle
  const handleReset = () => {
    setPoints([]);
    setMousePos(null);
    setSolved(false);
    setErrorMsg(null);
  };

  // Check solve conditions
  useEffect(() => {
    if (connectedDots.size === 9) {
      if (lineCount <= 4) {
        setSolved(true);
        setErrorMsg(null);
      } else {
        setErrorMsg("All dots connected, but you used more than 4 lines. Try to stretch outside the box!");
      }
    } else if (lineCount >= 4 && points.length > 0) {
      // If they reached 4 lines but didn't connect all dots
      setErrorMsg("4 lines used. Reset and try again! Hint: Draw lines extending beyond the dot grid.");
    }
  }, [points, connectedDots.size, lineCount]);

  return (
    <div ref={containerRef} className="w-[340px] md:w-[400px] bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-3xl p-6 flex flex-col items-center shadow-2xl backdrop-blur-md">
      
      {/* Header & Stats */}
      <div className="w-full flex justify-between items-center mb-4">
        <span className="font-mono-sos text-[10px] tracking-[0.2em] text-[var(--color-primary)] uppercase font-semibold">
          NINE-DOT PUZZLE
        </span>
        <button 
          onClick={handleReset}
          className="text-xs font-mono-sos uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border-none bg-transparent cursor-pointer"
        >
          Reset
        </button>
      </div>

      <div className="w-full flex justify-between text-xs font-mono-sos text-[var(--text-muted)] mb-4 px-2">
        <span>Dots Connected: <strong className="text-[var(--text-primary)]">{connectedDots.size}/9</strong></span>
        <span>Lines Used: <strong className={lineCount > 4 ? "text-[var(--color-orange)]" : "text-[var(--text-primary)]"}>{lineCount}/4</strong></span>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-square bg-[#0b0818]/60 border border-[var(--border)] rounded-2xl overflow-hidden cursor-crosshair group">
        <svg 
          viewBox="0 0 400 400" 
          className="w-full h-full"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Draw Helper grid lines */}
          <line x1="120" y1="40" x2="120" y2="360" stroke="rgba(165,128,255,0.02)" strokeDasharray="4 4" />
          <line x1="200" y1="40" x2="200" y2="360" stroke="rgba(165,128,255,0.02)" strokeDasharray="4 4" />
          <line x1="280" y1="40" x2="280" y2="360" stroke="rgba(165,128,255,0.02)" strokeDasharray="4 4" />
          <line x1="40" y1="120" x2="360" y2="120" stroke="rgba(165,128,255,0.02)" strokeDasharray="4 4" />
          <line x1="40" y1="200" x2="360" y2="200" stroke="rgba(165,128,255,0.02)" strokeDasharray="4 4" />
          <line x1="40" y1="280" x2="360" y2="280" stroke="rgba(165,128,255,0.02)" strokeDasharray="4 4" />

          {/* Border guideline matching the dot bounds to make 'inside' vs 'outside' clear */}
          <rect 
            x="120" 
            y="120" 
            width="160" 
            height="160" 
            fill="none" 
            stroke="rgba(255,255,255,0.04)" 
            strokeDasharray="5 5" 
            className="pointer-events-none"
          />

          {/* Draw completed lines in the path */}
          {points.length > 1 && (
            <polyline
              points={points.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(165,128,255,0.6)]"
            />
          )}

          {/* Draw active line preview */}
          {points.length > 0 && mousePos && !solved && (
            <line
              x1={points[points.length - 1].x}
              y1={points[points.length - 1].y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="rgba(165, 128, 255, 0.4)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
          )}

          {/* Draw the dots */}
          {dots.map((dot) => {
            const isConnected = connectedDots.has(dot.id);
            return (
              <g key={dot.id} className="transition-all duration-300">
                {/* Glow ring when connected */}
                {isConnected && (
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r="12"
                    fill="none"
                    stroke="var(--color-green)"
                    strokeWidth="1.5"
                    className="animate-ping opacity-35"
                  />
                )}
                {/* Outer ring */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="9"
                  fill="rgba(9, 7, 20, 0.8)"
                  stroke={isConnected ? "var(--color-green)" : "var(--border-strong)"}
                  strokeWidth="2"
                  className="transition-colors duration-300"
                />
                {/* Inner dot */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="4"
                  fill={isConnected ? "var(--color-green)" : "var(--text-muted)"}
                  className="transition-colors duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover / Hint indicators overlay */}
        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/35 backdrop-blur-[1px] transition-opacity duration-500 group-hover:opacity-0">
            <span className="font-mono-sos text-[10px] text-[var(--text-muted)] tracking-widest uppercase bg-black/60 px-4 py-2 rounded-full border border-white/5">
              Click dots to start drawing
            </span>
          </div>
        )}
      </div>

      {/* Info/Status Alert */}
      <div className="w-full mt-4 min-h-[48px] flex items-center justify-center text-center">
        {solved ? (
          <div className="text-[var(--color-green)] text-xs font-mono-sos uppercase tracking-wider animate-pulse font-semibold">
            ✦ SUCCESS! You solved it by thinking outside the box. ✦
          </div>
        ) : errorMsg ? (
          <div className="text-[var(--color-orange)] text-[11px] font-inter leading-relaxed">
            {errorMsg}
          </div>
        ) : (
          <div className="text-[var(--text-muted)] text-[11px] font-inter leading-relaxed px-2">
            Rule: Connect all 9 dots using at most 4 straight continuous lines.
          </div>
        )}
      </div>

    </div>
  );
}
