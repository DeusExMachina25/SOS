"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Concept B — veneer over plywood.
 *
 * The layers arrive flush as one solid block, then separate on scroll: the
 * veneer lifts off, the four discipline plies fan apart, the base slab holds.
 * Taking a finished surface apart to show what is underneath is the argument.
 */

interface Ply {
  kind: "veneer" | "ply" | "base";
  index: string;
  label: string;
  note: string;
}

const PLIES: Ply[] = [
  { kind: "veneer", index: "//", label: "The Second Opinion", note: "Laid on last" },
  { kind: "ply", index: "01", label: "Strategy", note: "" },
  { kind: "ply", index: "02", label: "Architecture", note: "" },
  { kind: "ply", index: "03", label: "Design", note: "" },
  { kind: "ply", index: "04", label: "Execution", note: "" },
  { kind: "base", index: "──", label: "Your Project", note: "Stays yours" }
];

/** Exploded offsets, in px, top layer travelling furthest */
const OFFSETS = [-96, -48, -24, 0, 24, 96];

export default function VeneerStack() {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const layers = layerRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!layers.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      layers.forEach((el, i) => gsap.set(el, { y: OFFSETS[i] }));
      return;
    }

    gsap.set(layers, { y: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top 80%",
        end: "bottom 40%",
        scrub: 1.2
      }
    });

    layers.forEach((el, i) => {
      tl.to(el, { y: OFFSETS[i], ease: "power2.out", duration: 1 }, 0);
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div ref={rootRef} className="w-full py-24 md:py-40">
      <div className="mx-auto w-full max-w-3xl flex flex-col">
        {PLIES.map((ply, i) => {
          const isVeneer = ply.kind === "veneer";
          const isBase = ply.kind === "base";
          return (
            <div
              key={ply.label}
              ref={el => { layerRefs.current[i] = el; }}
              className={[
                "relative flex items-center justify-between border-2 px-6 md:px-10",
                isBase ? "h-24 md:h-28" : "h-16 md:h-20",
                isVeneer
                  ? "border-[var(--color-orange)] bg-[var(--color-orange)]/10"
                  : isBase
                    ? "border-[var(--text-faint)] bg-[var(--bg-surface)]"
                    : "border-[var(--border-strong)] bg-[var(--bg-surface-2)]"
              ].join(" ")}
            >
              <span
                className={`font-mono-sos text-[10px] tracking-[0.3em] ${
                  isVeneer ? "text-[var(--color-orange)]" : "text-[var(--text-faint)]"
                }`}
              >
                {ply.index}
              </span>

              <span
                className={[
                  "font-display tracking-tight",
                  isVeneer
                    ? "text-xl md:text-3xl text-[var(--color-orange)]"
                    : isBase
                      ? "text-xl md:text-3xl text-[var(--text-primary)]"
                      : "text-lg md:text-2xl text-[var(--text-primary)]"
                ].join(" ")}
              >
                {ply.label}
              </span>

              <span className="font-mono-sos text-[9px] tracking-[0.2em] uppercase text-[var(--text-faint)] w-24 text-right">
                {ply.note}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
