"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Concept D — the vetting standard, borrowing the measurement columns from the
 * position-tracker background. Each criterion rises against a ruled rail and
 * has to clear the bar. Nothing here is a metric — the bar is a minimum, and
 * every invited expert stands above it.
 */

const CRITERIA = [
  { id: "01", label: "Built work", height: 78 },
  { id: "02", label: "Permits cleared", height: 92 },
  { id: "03", label: "Delivered on site", height: 66 },
  { id: "04", label: "Peer endorsement", height: 85 },
  { id: "05", label: "Years in practice", height: 72 }
];

/** Where the minimum sits, as a percentage of the rail */
const BAR = 58;
const TICKS = 16;

export default function VettingColumns() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const fills = fillRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!fills.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(fills, { scaleY: 1 });
      if (barRef.current) gsap.set(barRef.current, { scaleX: 1, opacity: 1 });
      return;
    }

    gsap.set(fills, { scaleY: 0, transformOrigin: "bottom center" });
    if (barRef.current) gsap.set(barRef.current, { scaleX: 0, opacity: 0, transformOrigin: "left center" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top 78%",
        end: "bottom 45%",
        scrub: 1.2
      }
    });

    if (barRef.current) {
      tl.to(barRef.current, { scaleX: 1, opacity: 1, duration: 1, ease: "power2.out" }, 0);
    }
    fills.forEach((el, i) => {
      tl.to(el, { scaleY: 1, duration: 1.4, ease: "power2.out" }, 0.3 + i * 0.18);
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div ref={rootRef} className="w-full py-24 md:py-32">
      <div className="mx-auto w-full max-w-4xl">
        <div className="relative flex h-[46vh] min-h-[320px] items-end gap-3 md:gap-6 border-l-2 border-b-2 border-[var(--border-strong)] pl-6 md:pl-10 pb-0">

          {/* ruled rail */}
          <div className="absolute inset-y-0 left-0 w-4 md:w-6 flex flex-col justify-between -translate-x-full pr-2">
            {Array.from({ length: TICKS }).map((_, i) => (
              <span
                key={i}
                className={`block h-px bg-[var(--text-faint)] ${i % 4 === 0 ? "w-full" : "w-1/2 self-end"}`}
              />
            ))}
          </div>

          {/* the minimum */}
          <div
            className="absolute left-0 right-0 flex items-center pointer-events-none"
            style={{ bottom: `${BAR}%` }}
          >
            <div
              ref={barRef}
              className="h-px flex-1 bg-[var(--color-orange)]"
              style={{ opacity: 0.7 }}
            />
            <span className="font-mono-sos text-[9px] tracking-[0.3em] uppercase text-[var(--color-orange)] pl-3">
              The Bar
            </span>
          </div>

          {CRITERIA.map((c, i) => (
            <div key={c.id} className="relative flex-1 h-full flex flex-col justify-end">
              <div
                ref={el => { fillRefs.current[i] = el; }}
                className="w-full border-t-2 border-x border-[var(--border-strong)] bg-[var(--color-primary-pale)]"
                style={{ height: `${c.height}%` }}
              />
              <span className="absolute -bottom-px left-0 right-0 h-px bg-[var(--border-strong)]" />
            </div>
          ))}
        </div>

        {/* legend beneath the rail */}
        <div className="flex gap-3 md:gap-6 pl-6 md:pl-10 pt-5">
          {CRITERIA.map(c => (
            <div key={c.id} className="flex-1 flex flex-col gap-2">
              <span className="font-mono-sos text-[9px] tracking-[0.3em] text-[var(--text-faint)]">{c.id}</span>
              <span className="font-display text-[11px] md:text-sm text-[var(--text-muted)] tracking-tight leading-tight">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
