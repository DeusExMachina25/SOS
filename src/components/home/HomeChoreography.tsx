"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

import MorphingLogo from "./MorphingLogo";
import Compass from "./Compass";
import TypewriterText from "./TypewriterText";
import NarrativeBox from "./NarrativeBox";
import FigmaComponent from "./FigmaComponent";
import KineticWordCloud from "./KineticWordCloud";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomeChoreography() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Component Refs for GSAP
  const typewriterRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const narrative1Ref = useRef<HTMLDivElement>(null);
  const wordCloudRef = useRef<HTMLDivElement>(null);
  const narrative2Ref = useRef<HTMLDivElement>(null);
  const figmaRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;

    // Reset components to initial states
    const els = [typewriterRef, compassRef, narrative1Ref, wordCloudRef, narrative2Ref, figmaRef, ctaRef];
    els.forEach(el => {
      if (el.current) {
        gsap.set(el.current, { opacity: 0, y: 100, x: 0 });
      }
    });

    if (logoRef.current) {
      gsap.set(logoRef.current, { scale: 1, opacity: 1, y: 0, x: 0 });
    }

    // Create a master timeline locked to scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5, // Smooth scrubbing
      }
    });

    // We will define specific progress points for each phase to enter and exit.
    
    // Phase 1 -> 2: Logo scales down, Typewriter & Compass appear
    tl.to(logoRef.current, { scale: 0.15, opacity: 0.15, duration: 1 }, 0)
      .to(typewriterRef.current, { opacity: 1, y: 0, x: "-15vw", duration: 1 }, 0)
      .to(compassRef.current, { opacity: 1, y: 0, x: "15vw", duration: 1 }, 0.5)
      
    // Phase 2 -> 3: Typewriter exits left, Narrative 1 enters right
    tl.to(typewriterRef.current, { opacity: 0, x: "-50vw", duration: 1 }, 2)
      .to(compassRef.current, { x: "-20vw", duration: 1 }, 2) // Compass moves left
      .to(narrative1Ref.current, { opacity: 1, y: 0, x: "20vw", duration: 1 }, 2.2)

    // Phase 3 -> 4: Compass exits left, Narrative 1 moves left, Word Cloud enters right
    tl.to(compassRef.current, { opacity: 0, x: "-80vw", duration: 1 }, 4)
      .to(narrative1Ref.current, { x: "-20vw", duration: 1 }, 4)
      .to(wordCloudRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1 }, 4.2)

    // Phase 4 -> 5: Narrative 1 exits left, Word cloud moves left, Narrative 2 enters right
    tl.to(narrative1Ref.current, { opacity: 0, x: "-80vw", duration: 1 }, 6)
      .to(wordCloudRef.current, { x: "-20vw", duration: 1 }, 6)
      .to(narrative2Ref.current, { opacity: 1, y: 0, x: "20vw", duration: 1 }, 6.2)

    // Phase 5 -> 6: Word cloud exits left, Narrative 2 moves left, Figma enters right
    tl.to(wordCloudRef.current, { opacity: 0, x: "-80vw", duration: 1 }, 8)
      .to(narrative2Ref.current, { x: "-25vw", duration: 1 }, 8)
      .to(figmaRef.current, { opacity: 1, y: 0, x: "25vw", duration: 1 }, 8.2)

    // Phase 6 -> 7: Narrative 2 exits left, Figma moves left, CTA enters right
    tl.to(narrative2Ref.current, { opacity: 0, x: "-80vw", duration: 1 }, 10)
      .to(figmaRef.current, { x: "-25vw", duration: 1 }, 10)
      .to(ctaRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1 }, 10.2)

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="relative w-full bg-[var(--bg-base)]">
      {/* Scroll track height: Determines how long the scroll experience is */}
      <div ref={scrollRef} className="h-[700vh] w-full relative">
        
        {/* Fixed Container for animations */}
        <div 
          ref={containerRef}
          className="fixed top-0 left-0 w-full h-screen overflow-hidden pointer-events-none flex items-center justify-center"
        >
          {/* Ambient Lighting Background */}
          <div className="ambient-glow-1"></div>
          <div className="ambient-glow-2"></div>
          
          {/* LOGO - Initial opening, scales down into center */}
          <div ref={logoRef} className="absolute z-0 pointer-events-none text-[8rem] md:text-[15rem] leading-none">
             <MorphingLogo />
          </div>

          {/* CHOREOGRAPHY ELEMENTS (All centered initially, moved via GSAP) */}
          
          <div ref={typewriterRef} className="absolute z-10 pointer-events-auto">
            <TypewriterText 
              startTyping={true}
              lines={[
                { text: "The", colorClass: "text-[var(--text-muted)]" },
                { text: "Art", colorClass: "text-white" },
                { text: "of", colorClass: "text-[var(--text-muted)]" },
                { text: "Second", colorClass: "text-white" },
                { text: "Opinions", colorClass: "text-[var(--color-primary)]" }
              ]} 
            />
          </div>

          <div ref={compassRef} className="absolute z-10 pointer-events-auto">
            <Compass tilted={true} />
          </div>

          <div ref={narrative1Ref} className="absolute z-20 pointer-events-auto">
            <NarrativeBox 
              title="A Leap of Faith"
              paragraphs={[
                "Every monumental space begins with a solitary leap of faith. A line drawn across a blank canvas.",
                "A quiet intuition about how morning light should trace the edge of a load-bearing wall, or how a space might dictate the rhythm of the lives lived around it."
              ]}
              remark="— Initial Spark"
            />
          </div>

          <div ref={wordCloudRef} className="absolute z-10 pointer-events-auto">
            <KineticWordCloud />
          </div>

          <div ref={narrative2Ref} className="absolute z-20 pointer-events-auto">
            <NarrativeBox 
              title="The Expanse of the Void"
              paragraphs={[
                "Between the initial spark of creativity and the pouring of concrete lies an expanse of the void.",
                "When you are too close to the canvas, blind spots emerge, not from a lack of skill, but from an excess of passion."
              ]}
              remark="— Blind spots of creation"
            />
          </div>

          <div ref={figmaRef} className="absolute z-30 pointer-events-auto scale-110">
            <FigmaComponent />
          </div>

          <div ref={ctaRef} className="absolute z-40 pointer-events-auto flex flex-col items-center gap-8">
            <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white mb-2">
              Calibration.
            </h2>
            <p className="font-inter text-lg text-[var(--text-muted)] max-w-md text-center mb-6">
              Seeking counsel is never a surrender of your vision. 
            </p>
            <div className="flex gap-6">
              <Link href="/login" className="btn-sos-filled">
                Client Login
              </Link>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
