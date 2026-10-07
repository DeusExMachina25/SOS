"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const COLUMNS = 6;
/* Ruler ticks down the left rail */
const TICKS = 24;

interface PositionTrackerBackgroundProps {
  /** The tall scroll track the choreography timeline is pinned to */
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** Scroll progress where the grid starts fading in (logo flight ends ~0.11) */
  revealStart?: number;
  /** Scroll progress where the grid is fully visible */
  revealEnd?: number;
}

/**
 * Scroll-reactive measurement grid, revealed once the SOS logo has flown past.
 * Columns fill from the bottom with a per-column stagger, a scan line rides the
 * viewport, and a HUD reads out raw pixel offset + normalised progress.
 * All updates are direct DOM writes — no React re-render on scroll.
 */
export default function PositionTrackerBackground({
  trackRef,
  revealStart = 0.10,
  revealEnd = 0.18
}: PositionTrackerBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLSpanElement>(null);
  const normRef = useRef<HTMLSpanElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    const root = rootRef.current;
    const scan = scanRef.current;
    const marker = markerRef.current;
    if (!track || !root || !scan || !marker) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setOpacity = gsap.quickSetter(root, "opacity");
    const setScanY = gsap.quickSetter(scan, "y", "px");
    const setMarkerY = gsap.quickSetter(marker, "y", "px");
    const setFills = fillRefs.current.map(el => (el ? gsap.quickSetter(el, "scaleY") : null));

    let viewportH = window.innerHeight;
    let lastPos = -1;

    const onResize = () => { viewportH = window.innerHeight; };
    window.addEventListener("resize", onResize);

    const st = ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;

        // Fade in only after the logo has scaled through the camera
        const reveal = gsap.utils.clamp(0, 1, (p - revealStart) / (revealEnd - revealStart));
        setOpacity(reveal);
        root.style.visibility = reveal <= 0.001 ? "hidden" : "visible";
        if (reveal <= 0.001) return;

        // Columns fill bottom-up, each one lagging the last
        for (let i = 0; i < setFills.length; i++) {
          const setFill = setFills[i];
          if (!setFill) continue;
          setFill(gsap.utils.clamp(0, 1, (p - i * 0.035) * 1.25));
        }

        if (!reduceMotion) {
          setScanY(p * viewportH);
          setMarkerY(p * viewportH);
        }

        // Readouts — skip the DOM write when the rounded value is unchanged
        const scrolled = Math.round(self.scroll());
        if (scrolled !== lastPos) {
          lastPos = scrolled;
          if (posRef.current) posRef.current.textContent = String(scrolled).padStart(6, "0");
          if (normRef.current) normRef.current.textContent = p.toFixed(3);
        }
      }
    });

    // Cursor spotlight — pointer devices only, rAF-throttled
    let rafId = 0;
    let px = 0;
    let py = 0;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const flushPointer = () => {
      rafId = 0;
      root.style.setProperty("--pt-x", `${px}px`);
      root.style.setProperty("--pt-y", `${py}px`);
    };
    const onPointerMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(flushPointer);
    };
    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    return () => {
      st.kill();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [trackRef, revealStart, revealEnd]);

  return (
    <div ref={rootRef} className="pt-root" aria-hidden="true">
      <div className="pt-spotlight" />

      {/* Measurement columns */}
      <div className="pt-grid">
        {Array.from({ length: COLUMNS }).map((_, i) => (
          <span
            key={i}
            className={`pt-col ${i >= COLUMNS - 2 ? "pt-col-wide-only" : ""}`}
          >
            <span
              ref={el => { fillRefs.current[i] = el; }}
              className="pt-fill"
            />
          </span>
        ))}
      </div>

      {/* Left rail ruler + travelling marker */}
      <div className="pt-rail">
        {Array.from({ length: TICKS }).map((_, i) => (
          <span key={i} className={`pt-tick ${i % 4 === 0 ? "pt-tick-major" : ""}`} />
        ))}
        <div ref={markerRef} className="pt-marker" />
      </div>

      {/* Scan line riding the scroll position */}
      <div ref={scanRef} className="pt-scan" />

      {/* HUD readout */}
      <div className="pt-hud">
        <span className="pt-hud-label">Motion becomes measurement</span>
        <span className="pt-hud-row">
          <span className="pt-hud-key">pos</span>
          <span ref={posRef} className="pt-hud-value">000000</span>
        </span>
        <span className="pt-hud-row">
          <span className="pt-hud-key">nrm</span>
          <span ref={normRef} className="pt-hud-value">0.000</span>
        </span>
      </div>
    </div>
  );
}
