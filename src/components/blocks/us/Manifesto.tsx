"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const MANIFESTO_PILLARS = [
  {
    short: "Calibration.",
    title: "Refine, don't reduce.",
    description: "A second opinion isn't a cage or a compromise. We adapt to the rhythm of your project and sharpen what's already there — never flattening the vision to fit a template."
  },
  {
    short: "Clarity.",
    title: "Clarity over complexity.",
    description: "In an ocean of noise, we prioritize signal. We strip away the unnecessary until only the essential truth of your vision remains, architecting foundations that endure."
  },
  {
    short: "Security.",
    title: "Your drawings stay yours.",
    description: "Plans, elevations, site surveys, and the half-formed sketches in between. Everything you share sits in an encrypted vault, and nothing leaves the session without you."
  },
  {
    short: "Standard.",
    title: "Measured on what stands.",
    description: "Every expert here is vetted on built work, not portfolios of intent — permits cleared, projects delivered, peers who'll vouch for them before they take a single session."
  }
];

/**
 * U5: The Manifesto. A pinned scroll scene: four pillars rise one by one with
 * their headline, the roof drops on, and the four descriptions appear below.
 */
export default function Manifesto() {
  const templeSectionRef = useRef<HTMLDivElement>(null);
  const templeCenterTextsRef = useRef<(HTMLDivElement | null)[]>([]);
  const templePillarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const templePillarTitlesRef = useRef<(HTMLDivElement | null)[]>([]);
  const templeRoofRef = useRef<HTMLDivElement>(null);
  const templeRoofTextRef = useRef<HTMLDivElement>(null);
  const horizontalTextsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (templeSectionRef.current) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: templeSectionRef.current,
            start: "top top",
            end: "+=700%", 
            pin: true,
            scrub: 1,
            anticipatePin: 1
          }
        });

        // Initial state
        gsap.set(templeCenterTextsRef.current, { opacity: 0, y: 30 });
        gsap.set(templePillarsRef.current, { scaleY: 0, transformOrigin: "bottom" });
        gsap.set(templePillarTitlesRef.current, { opacity: 0 });
        gsap.set(templeRoofRef.current, { scaleX: 0, transformOrigin: "center", opacity: 0 });
        gsap.set(templeRoofTextRef.current, { opacity: 0, y: 10 });
        gsap.set(horizontalTextsRef.current, { opacity: 0, y: 20 });

        // Build sequence: Loop through the 4 pillars
        templePillarsRef.current.forEach((pillar, i) => {
          const text = templeCenterTextsRef.current[i];
          const title = templePillarTitlesRef.current[i];
        
          // Show center text & Erect pillar
          tl.to(text, { opacity: 1, y: 0, duration: 1 }, `step${i}`)
            .to(pillar, { scaleY: 1, duration: 1.5, ease: "power2.out" }, `step${i}`)
            .to(title, { opacity: 1, duration: 0.8 }, `step${i}+=0.5`);
        
          // Wait
          tl.to({}, { duration: 0.5 });
        
          // Hide center text
          tl.to(text, { opacity: 0, y: -30, duration: 1 }, `hide${i}`);
        });

        // Drop the Roof
        tl.to(templeRoofRef.current, { scaleX: 1, opacity: 1, duration: 1.5, ease: "power3.out" }, "roof")
          .to(templeRoofTextRef.current, { opacity: 1, y: 0, duration: 1 }, "roof+=0.5")
        
        // Reveal the Horizontal Text Boxes layout at the very end
        tl.to(horizontalTextsRef.current, { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" }, "roof+=1")
        
        // Enormous End padding so there's plenty of scroll space after it builds
        tl.to({}, { duration: 4 });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <section ref={templeSectionRef} className="w-full h-screen relative bg-[var(--bg-base)] border-t border-[var(--border)] flex flex-col items-center overflow-hidden z-10">

      {/* Story Texts (Flashes in the center while scrolling) */}
      <div className="absolute top-[10%] md:top-[15%] left-0 w-full px-6 flex justify-center z-20 pointer-events-none">
        <div className="relative w-full max-w-4xl h-[25vh] flex items-center justify-center text-center">
          {MANIFESTO_PILLARS.map((pillar, index) => (
            <div 
              key={index} 
              ref={(el) => { templeCenterTextsRef.current[index] = el; }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className="font-mono-sos text-[10px] text-[var(--text-muted)] tracking-[0.4em] mb-4 uppercase">
                Pillar 0{index + 1}
              </div>
              <h3 className="font-display text-3xl md:text-6xl font-normal text-[var(--text-primary)] tracking-tight leading-tight">
                {pillar.title}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* The Architectural Visuals (Roof + Pillars) */}
      <div className="absolute top-[40%] md:top-[35%] w-full max-w-7xl flex flex-col items-center px-4 md:px-12 z-10 h-[35vh] md:h-[40vh]">

        {/* The Thickened Roof */}
        <div 
          ref={templeRoofRef}
          className="w-full h-24 md:h-32 border-2 border-[var(--border-strong)] bg-[var(--bg-surface-2)] backdrop-blur-xl flex items-center justify-center relative z-20 shadow-2xl"
        >
           <div 
             ref={templeRoofTextRef}
             className="font-futuristic text-2xl md:text-4xl text-[var(--text-primary)] tracking-widest uppercase opacity-90"
           >
             The Manifesto
           </div>
        </div>

        {/* The 4 Pillars */}
        <div className="w-full flex justify-between px-2 md:px-12 -mt-[2px] h-full flex-grow">
          {MANIFESTO_PILLARS.map((pillar, i) => (
            <div 
              key={i}
              ref={(el) => { templePillarsRef.current[i] = el; }}
              className="w-[20%] md:w-[15%] h-full border-l-2 border-r-2 border-b-2 border-[var(--border-strong)] bg-[var(--bg-surface)] backdrop-blur-sm relative flex flex-col items-center justify-center"
            >
              {/* Horizontal text inside the pillar */}
              <div 
                ref={(el) => { templePillarTitlesRef.current[i] = el; }}
                className="font-display text-xs md:text-xl text-[var(--text-primary)] text-center tracking-tight px-2"
              >
                {pillar.short}
              </div>
              {/* Subtle lighting line inside the pillar */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-[var(--text-primary)] opacity-5"></div>
            </div>
          ))}
        </div>
      </div>

      {/* The Horizontal Text Arrangement (Revealed at the end) */}
      <div 
        ref={horizontalTextsRef}
        className="absolute bottom-0 w-full max-w-7xl px-4 md:px-16 flex justify-between items-start h-[25vh] md:h-[25vh] pb-8 z-20"
      >
        {MANIFESTO_PILLARS.map((pillar, i) => (
          <div key={i} className="w-[20%] md:w-[18%] flex flex-col items-center text-center">
            <div className="font-mono-sos text-[8px] md:text-[10px] text-[var(--text-primary)] tracking-[0.2em] uppercase mb-4 opacity-50">
              Pillar 0{i + 1}
            </div>
            <p className="font-inter text-[10px] md:text-xs text-[var(--text-muted)] leading-relaxed font-light hidden md:block">
              {pillar.description}
            </p>
          </div>
        ))}
      </div>

    </section>
  );
}
