"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const W = 800;
const H = 520;

/**
 * Concept A — the section cut.
 *
 * A polished elevation occupies the frame; a cut blade sweeps across it on
 * scroll and everything behind it resolves into a section drawing: slabs,
 * stairs, the double-height void the render never showed.
 */
export default function FacadeSectionCut() {
  const rootRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<SVGRectElement>(null);
  const hideRef = useRef<SVGRectElement>(null);
  const bladeRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !revealRef.current || !hideRef.current || !bladeRef.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Land on the cut half-open so both drawings read at once
      gsap.set(revealRef.current, { attr: { width: W * 0.5 } });
      gsap.set(hideRef.current, { attr: { x: W * 0.5, width: W * 0.5 } });
      gsap.set(bladeRef.current, { x: W * 0.5 });
      return;
    }

    gsap.set(revealRef.current, { attr: { width: 0 } });
    gsap.set(hideRef.current, { attr: { x: 0, width: W } });
    gsap.set(bladeRef.current, { x: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top 75%",
        end: "bottom 25%",
        scrub: 1.2
      }
    });

    tl.to(revealRef.current, { attr: { width: W }, ease: "none" }, 0)
      .to(hideRef.current, { attr: { x: W, width: 0 }, ease: "none" }, 0)
      .to(bladeRef.current, { x: W, ease: "none" }, 0);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div ref={rootRef} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="An architectural elevation cut open to reveal the section behind it"
      >
        <defs>
          <clipPath id="sos-cut-reveal">
            <rect ref={revealRef} x="0" y="0" width="0" height={H} />
          </clipPath>
          <clipPath id="sos-cut-hide">
            <rect ref={hideRef} x="0" y="0" width={W} height={H} />
          </clipPath>
          <pattern id="sos-poche" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.45" />
          </pattern>
        </defs>

        {/* ── THE SECTION (revealed behind the blade) ─────────────── */}
        <g clipPath="url(#sos-cut-reveal)">
          {/* poche: the cut structure */}
          <rect x="120" y="52" width="560" height="16" fill="url(#sos-poche)" stroke="var(--text-primary)" strokeWidth="2" />
          <rect x="120" y="68" width="16" height="392" fill="url(#sos-poche)" stroke="var(--text-primary)" strokeWidth="2" />
          <rect x="664" y="68" width="16" height="392" fill="url(#sos-poche)" stroke="var(--text-primary)" strokeWidth="2" />

          {/* floor slabs */}
          {[168, 268, 368].map(y => (
            <rect key={y} x="136" y={y} width="528" height="10" fill="url(#sos-poche)" stroke="var(--text-primary)" strokeWidth="1.5" />
          ))}

          {/* the double-height void — the thing the render hid */}
          <rect
            x="168" y="178" width="180" height="190"
            fill="none" stroke="var(--color-orange)" strokeWidth="2" strokeDasharray="8 6"
          />
          <line x1="168" y1="368" x2="348" y2="178" stroke="var(--color-orange)" strokeWidth="1" opacity="0.4" />

          {/* stair run */}
          <path
            d="M 470 368 L 470 344 L 502 344 L 502 320 L 534 320 L 534 296 L 566 296 L 566 272 L 598 272 L 598 268"
            fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="miter"
          />

          {/* interior partition + occupant scale figure */}
          <line x1="400" y1="278" x2="400" y2="368" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.5" />
          <line x1="430" y1="368" x2="430" y2="330" stroke="var(--color-primary)" strokeWidth="2" />
          <circle cx="430" cy="323" r="6" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        </g>

        {/* ── THE ELEVATION (the polished face) ───────────────────── */}
        <g clipPath="url(#sos-cut-hide)">
          <rect x="120" y="52" width="560" height="408" fill="var(--bg-surface-2)" stroke="var(--text-primary)" strokeWidth="2" />
          {[100, 196, 292].map(y =>
            [160, 288, 416, 544].map(x => (
              <rect
                key={`${x}-${y}`} x={x} y={y} width="96" height="64"
                fill="var(--color-primary-pale)" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.9"
              />
            ))
          )}
          <rect x="352" y="388" width="96" height="72" fill="var(--bg-base)" stroke="var(--text-primary)" strokeWidth="2" />
        </g>

        {/* ground line */}
        <line x1="60" y1="460" x2="740" y2="460" stroke="var(--text-primary)" strokeWidth="2" />

        {/* ── THE BLADE ───────────────────────────────────────────── */}
        <g ref={bladeRef}>
          <line x1="0" y1="24" x2="0" y2="496" stroke="var(--color-orange)" strokeWidth="2" />
          <path d="M -7 24 L 7 24 L 0 38 Z" fill="var(--color-orange)" />
          <path d="M -7 496 L 7 496 L 0 482 Z" fill="var(--color-orange)" />
        </g>

        <text x="60" y="496" className="font-mono-sos" fontSize="11" fill="var(--text-faint)">SECTION</text>
        <text x="740" y="496" textAnchor="end" className="font-mono-sos" fontSize="11" fill="var(--text-faint)">ELEVATION</text>
      </svg>
    </div>
  );
}
