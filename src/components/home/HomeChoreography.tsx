"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import MorphingLogo from "./MorphingLogo";
import Compass from "./Compass";
import NineDotLoop from "../shared/NineDotLoop";
import PositionTrackerBackground from "../shared/PositionTrackerBackground";
import VideoDiorama from "./VideoDiorama";
import FloorplanSketch from "./FloorplanSketch";
import { HOME_BEATS, type HomeBeat, type HomeVisual } from "./homeBeats";
import { HOME_STORY } from "@/config/homeStory";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Seconds of timeline between one beat and the next. */
const STEP = 2;
/** The original 7-beat story ran 13.7s of timeline over 1000vh of scroll. */
const VH_PER_SECOND = 1000 / 13.7;

const story = HOME_STORY.map((id) => ({ id, ...(HOME_BEATS[id] as HomeBeat) }));
const visualsUsed = Array.from(new Set(story.map((b) => b.visual)));
const TOTAL = Math.max(0, story.length - 1) * STEP + 1.9;

/** "20vw" on the right, "-20vw" on the left */
const at = (side: number, v: string) => (side < 0 ? `-${v}` : v);

export default function HomeChoreography() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const visualRefs = useRef<Partial<Record<HomeVisual, HTMLDivElement | null>>>({});

  const [isScrolled, setIsScrolled] = useState(false);
  const [compassTiltMode, setCompassTiltMode] = useState<"2d" | "2.5d" | "3d">("2d");
  const [activeVisual, setActiveVisual] = useState<HomeVisual | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;

    const copies = story.map((b) => copyRefs.current[b.id]);
    const visuals = visualsUsed.map((v) => visualRefs.current[v]);
    gsap.set([...copies, ...visuals].filter(Boolean), { autoAlpha: 0, y: 100, x: 0 });
    gsap.set(logoRef.current, { scale: 1, autoAlpha: 1, y: 0, x: 0 });

    const scrollTrigger = {
      trigger: scrollRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
      onUpdate: (self: ScrollTrigger) => {
        setIsScrolled(self.progress > 0.02);
        // The compass takes the look of whichever beat is playing
        const k = Math.min(story.length - 1, Math.max(0, Math.floor((self.progress * TOTAL + 0.1) / STEP)));
        const tilt = story[k]?.compassTilt;
        if (tilt) setCompassTiltMode(tilt);
        // Which picture is on screen (none before the logo has flown through)
        setActiveVisual(self.progress * TOTAL < 0.5 ? null : story[k]?.visual ?? null);
      },
    };

    // The animation layer is pinned to the screen. Hide it once you scroll past
    // the story, so anything placed below (extra blocks, footer) shows cleanly.
    const layerTrigger = ScrollTrigger.create({
      trigger: scrollRef.current,
      start: "top top",
      end: "bottom bottom",
      onLeave: () => gsap.set(containerRef.current, { autoAlpha: 0 }),
      onEnterBack: () => gsap.set(containerRef.current, { autoAlpha: 1 }),
    });

    const copyOf = (id: string) => copyRefs.current[id] ?? null;
    const visualOf = (v: HomeVisual) => visualRefs.current[v] ?? null;
    const logoFlight = (tl: gsap.core.Timeline) =>
      tl.to(logoRef.current, { scale: 150, autoAlpha: 0, duration: 1.5, ease: "power2.in" }, 0);

    const mm = gsap.matchMedia();

    // ── Wide screens: copy and picture trade places left and right ──────
    mm.add("(min-width: 1280px)", () => {
      const tl = gsap.timeline({ scrollTrigger });
      logoFlight(tl);

      let side = -1; // first copy on the left
      story.forEach((beat, k) => {
        const T = k * STEP;
        const prev = story[k - 1];
        const shared = !!prev && prev.visual === beat.visual;
        const copyX = beat.copyX ?? "20vw";
        const visualX = beat.visualX ?? "20vw";

        if (prev) {
          // previous copy leaves towards its own edge
          tl.to(copyOf(prev.id), { autoAlpha: 0, x: at(-side, "80vw"), duration: 1.5 }, T);
          // previous picture leaves too, unless this beat keeps it
          if (!shared) tl.to(visualOf(prev.visual), { autoAlpha: 0, x: at(side, "80vw"), duration: 1.5 }, T);
        }

        if (shared) {
          tl.to(visualOf(beat.visual), { x: at(-side, visualX), duration: 1.5 }, T);
        } else {
          tl.to(visualOf(beat.visual), { autoAlpha: 1, y: 0, x: at(-side, visualX), duration: 1.5 }, T + (k === 0 ? 0.5 : 0.2));
        }
        tl.to(copyOf(beat.id), { autoAlpha: 1, y: 0, x: at(side, copyX), duration: 1.5 }, T + (k === 0 ? 0 : shared ? 0.2 : 0.4));

        side = -side;
      });
    });

    // ── Phones and tablets (under 1280px): same beats and timing, stacked.
    //    Picture in the upper half, copy in the lower half. Nothing moves
    //    sideways, so no copy can leave the screen. ─────────────────────────
    mm.add("(max-width: 1279px)", () => {
      const tl = gsap.timeline({ scrollTrigger });
      logoFlight(tl);

      story.forEach((beat, k) => {
        const T = k * STEP;
        const prev = story[k - 1];
        const shared = !!prev && prev.visual === beat.visual;

        if (prev) {
          tl.to(copyOf(prev.id), { autoAlpha: 0, y: prev.phoneCopyExitY ?? "30vh", duration: 1.5 }, T);
          if (!shared) tl.to(visualOf(prev.visual), { autoAlpha: 0, y: "-34vh", duration: 1.5 }, T);
        }

        const visualY = beat.phoneVisualY ?? "-19vh";
        if (shared) {
          tl.to(visualOf(beat.visual), { y: visualY, duration: 1.5 }, T);
        } else {
          tl.to(visualOf(beat.visual), { autoAlpha: 1, x: 0, y: visualY, duration: 1.5 }, T + (k === 0 ? 0.5 : 0.2));
        }
        tl.to(copyOf(beat.id), { autoAlpha: 1, x: 0, y: beat.phoneCopyY ?? "17vh", duration: 1.5 }, T + (k === 0 ? 0 : shared ? 0.2 : 0.4));
      });
    });

    return () => {
      mm.revert();
      layerTrigger.kill();
    };
  }, []);

  return (
    <div className="relative w-full bg-[var(--bg-base)]">
      {/* Scroll track height: Determines how long the scroll experience is */}
      <div ref={scrollRef} className="w-full relative" style={{ height: `${Math.round(TOTAL * VH_PER_SECOND)}vh` }}>
        
        {/* Fixed Container for animations */}
        <div 
          ref={containerRef}
          className="fixed top-0 left-0 w-full h-svh overflow-hidden pointer-events-none flex items-center justify-center"
        >
          {/* Aurora Lighting Background */}
          <div className="aurora-bg"></div>

          {/* Position-tracker grid — fades in once the logo has flown through */}
          <PositionTrackerBackground trackRef={scrollRef} revealStart={1.37 / TOTAL} revealEnd={2.47 / TOTAL} />

          {/* MAIN LOGO - Initial opening, shrinks and disappears */}
          <div ref={logoRef} className="absolute z-1 pointer-events-none text-[8rem] md:text-[15rem] leading-none">
             <MorphingLogo variant={isScrolled ? "embossed" : "main"} />
          </div>

          {/* Pictures: each shows while its beats play */}
          {visualsUsed.includes("compass") && (
            <div ref={(el) => { visualRefs.current.compass = el; }} className="absolute z-10 pointer-events-auto opacity-0 scale-75 xl:scale-100">
              <Compass tiltMode={compassTiltMode} />
            </div>
          )}
          {visualsUsed.includes("floorplan") && (
            <div ref={(el) => { visualRefs.current.floorplan = el; }} className="absolute z-10 pointer-events-auto">
              <FloorplanSketch playing={activeVisual === "floorplan"} />
            </div>
          )}
          {visualsUsed.includes("diorama") && (
            <div ref={(el) => { visualRefs.current.diorama = el; }} className="absolute z-10 pointer-events-auto">
              <VideoDiorama />
            </div>
          )}
          {visualsUsed.includes("ninedot") && (
            <div ref={(el) => { visualRefs.current.ninedot = el; }} className="absolute z-30 pointer-events-auto scale-90 xl:scale-110">
              <NineDotLoop />
            </div>
          )}

          {/* Copy for each beat, in the order set in src/config/homeStory.ts */}
          {story.map((beat) => (
            <div
              key={beat.id}
              ref={(el) => { copyRefs.current[beat.id] = el; }}
              className={`absolute pointer-events-auto ${beat.copyClass ?? ""}`}
            >
              {beat.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
