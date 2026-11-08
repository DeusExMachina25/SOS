"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FacadeSectionCut from "@/components/us/FacadeSectionCut";
import VeneerStack from "@/components/us/VeneerStack";
import VettingColumns from "@/components/us/VettingColumns";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Beat {
  index: string;
  eyebrow: string;
  title: string;
  content: string;
  Graphic: React.ComponentType;
}

const BEATS: Record<"render" | "collective" | "standard", Beat> = {
  render: {
    index: "001",
    eyebrow: "Why we built it",
    title: "Every render hides a section.",
    content:
      "Most advice on a project comes attached to something being sold. Here the second opinion is the whole service, given in plain words by someone who has built the thing before.",
    Graphic: FacadeSectionCut,
  },
  collective: {
    index: "002",
    eyebrow: "The collective",
    title: "Invited, not listed.",
    content:
      "Architects, designers and engineers join by invitation. We check what they've built before they take their first session.",
    Graphic: VeneerStack,
  },
  standard: {
    index: "003",
    eyebrow: "The standard",
    title: "Measured on what stands.",
    content:
      "Renders of things that never got built don't count. We look at what was approved, what was built and what's still standing, and then we call the people who worked with them.",
    Graphic: VettingColumns,
  },
};

/** One Genesis beat: text on the left, its animated drawing on the right. */
function GenesisBeat({ beat, withHeading = false }: { beat: Beat; withHeading?: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rowRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: rowRef.current, start: "top 80%", toggleActions: "play none none reverse" },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  const { Graphic } = beat;

  return (
    <section
      className={`w-full px-6 relative z-10 ${
        withHeading ? "pt-32 md:pt-48 mt-16 border-t border-[var(--border)]" : ""
      }`}
    >
      <div className="container mx-auto max-w-7xl relative z-10">
        {withHeading && (
          <div className="flex flex-col items-center justify-center text-center mb-24 md:mb-32">
            <h2 className="font-display text-4xl md:text-6xl font-normal text-[var(--text-primary)] mb-6 tracking-tight">The Genesis.</h2>
            <p className="font-mono-sos text-[10px] tracking-[0.3em] text-[var(--text-muted)] uppercase mb-8">How we arrived here</p>
            <div className="w-px h-16 bg-[var(--border-strong)] mx-auto"></div>
          </div>
        )}

        <div ref={rowRef} className="w-full border-t border-[var(--border-strong)] pt-10 md:pt-14 pb-20 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-start gap-10 md:gap-16">
            <div className="md:w-[38%] shrink-0 flex flex-col">
              <div className="flex items-baseline gap-4 mb-8">
                <span className="font-mono-sos text-[10px] tracking-[0.4em] text-[var(--color-orange)]">{beat.index}</span>
                <span className="font-mono-sos text-[10px] tracking-[0.4em] uppercase text-[var(--text-faint)]">{beat.eyebrow}</span>
              </div>
              <h3 className="font-display text-3xl md:text-5xl font-normal mb-8 text-[var(--text-primary)] tracking-tighter leading-[0.95]">
                {beat.title}
              </h3>
              <p className="font-inter text-[var(--text-muted)] text-base md:text-lg leading-relaxed font-light">{beat.content}</p>
            </div>
            <div className="md:w-[62%] w-full">
              <Graphic />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** U2: "The Genesis." heading + 001 "Every render hides a section." */
export function GenesisRender() {
  return <GenesisBeat beat={BEATS.render} withHeading />;
}

/** U3: 002 "Invited, not listed." */
export function GenesisCollective() {
  return <GenesisBeat beat={BEATS.collective} />;
}

/** U4: 003 "Measured on what stands." */
export function GenesisStandard() {
  return <GenesisBeat beat={BEATS.standard} />;
}
