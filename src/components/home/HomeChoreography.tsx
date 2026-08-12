"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

import MorphingLogo from "./MorphingLogo";
import Compass from "./Compass";
import TypewriterText from "./TypewriterText";
import MinimalStoryBox from "./MinimalStoryBox";
import PantoneEyesCard from "./PantoneEyesCard";
import VideoDiorama from "./VideoDiorama";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const TYPEWRITER_LINES = [
  { text: "The Art", colorClass: "text-[var(--text-primary)]" },
  { text: "of", colorClass: "text-[var(--text-muted)] pl-4 md:pl-12" },
  { text: "Second Opinions", colorClass: "text-[var(--color-primary)] pl-8 md:pl-24" }
];

export default function HomeChoreography() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Component Refs for GSAP
  const typewriterRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const narrative1aRef = useRef<HTMLDivElement>(null);
  const narrative1bRef = useRef<HTMLDivElement>(null);
  const dioramaRef = useRef<HTMLDivElement>(null);
  const narrative2aRef = useRef<HTMLDivElement>(null);
  const narrative2bRef = useRef<HTMLDivElement>(null);
  const narrative3Ref = useRef<HTMLDivElement>(null);
  const figmaRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const explosionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [compassTiltMode, setCompassTiltMode] = useState<'2d'|'2.5d'|'3d'>('2d');

  useEffect(() => {
    if (!scrollRef.current) return;

    // Reset components to initial states
    const els = [
      typewriterRef, compassRef, dioramaRef, figmaRef, ctaRef,
      narrative1aRef, narrative1bRef, narrative2aRef, narrative2bRef, narrative3Ref
    ];
    els.forEach(el => {
      if (el.current) {
        gsap.set(el.current, { opacity: 0, y: 100, x: 0 });
      }
    });

    if (logoRef.current) {
      gsap.set(logoRef.current, { scale: 1, opacity: 1, y: 0, x: 0 });
    }
    explosionRefs.current.forEach(el => {
      if (el) gsap.set(el, { opacity: 0, x: 0, y: 0, scale: 0.5, rotation: 0 });
    });

    // Create a master timeline locked to scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
        onUpdate: (self) => {
          setIsScrolled(self.progress > 0.02);
          // Timeline duration ~13.5s.
          // Phase 2 starts at 2.0s (2.0/13.5 = ~0.148) -> 2.5D
          // Phase 3 starts at 4.0s (4.0/13.5 = ~0.296) -> 3D
          if (self.progress > 0.29) setCompassTiltMode('3d');
          else if (self.progress > 0.14) setCompassTiltMode('2.5d');
          else setCompassTiltMode('2d');
        }
      }
    });

    // Phase 1: Logo flight-through (scales up to 150), Typewriter (L) & Compass 2D (R) appear
    tl.to(logoRef.current, { scale: 150, opacity: 0, duration: 1.5, ease: "power2.in" }, 0)
      .to(typewriterRef.current, { opacity: 1, y: 0, x: "-15vw", duration: 1.5 }, 0)
      .to(compassRef.current, { opacity: 1, y: 0, x: "15vw", duration: 1.5 }, 0.5);

    explosionRefs.current.forEach((el, i) => {
      if (!el) return;
      const total = explosionRefs.current.length;
      const angle = (Math.PI * 2 * i) / total;
      const radiusX = 35 + Math.random() * 15; 
      const radiusY = 35 + Math.random() * 15; 
      const x = Math.cos(angle) * radiusX + "vw";
      const y = Math.sin(angle) * radiusY + "vh";
      const rotation = (Math.random() - 0.5) * 360;
      const finalScale = 0.5 + Math.random() * 0.5;

      tl.to(el, {
        x, y, rotation, scale: finalScale, opacity: 0.12,
        duration: 3, ease: "power2.out"
      }, 0);
    });
      
    // Phase 2: Typewriter exits left, Compass shifts left, Narrative 1a enters right
    tl.to(typewriterRef.current, { opacity: 0, x: "-50vw", duration: 1.5 }, 2.0)
      .to(compassRef.current, { x: "-20vw", duration: 1.5 }, 2.0) 
      .to(narrative1aRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, 2.2)

    // Phase 3: Compass tilts and moves Right, Narrative 1a moves Left and fades out to become 1b
    tl.to(compassRef.current, { x: "20vw", duration: 1.5 }, 4.0)
      .to(narrative1aRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, 4.0)
      .to(narrative1bRef.current, { opacity: 1, y: 0, x: "-20vw", duration: 1.5 }, 4.2)

    // Phase 4: Compass exits right, Narrative 1b exits right, Diorama enters right, Narrative 2a enters left
    tl.to(compassRef.current, { opacity: 0, x: "80vw", duration: 1.5 }, 6.0)
      .to(narrative1bRef.current, { opacity: 0, x: "80vw", duration: 1.5 }, 6.0)
      .to(dioramaRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, 6.2)
      .to(narrative2aRef.current, { opacity: 1, y: 0, x: "-20vw", duration: 1.5 }, 6.4)

    // Phase 5: Diorama moves left, Narrative 2a exits left, Narrative 2b enters right
    tl.to(dioramaRef.current, { x: "-20vw", duration: 1.5 }, 8.0)
      .to(narrative2aRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, 8.0)
      .to(narrative2bRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, 8.2)

    // Phase 6: Diorama exits Left. 2b exits Right. Pantone Card enters Left. Narrative 3 enters right.
    tl.to(dioramaRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, 10.0)
      .to(narrative2bRef.current, { opacity: 0, x: "80vw", duration: 1.5 }, 10.0)
      .to(figmaRef.current, { opacity: 1, y: 0, x: "-25vw", duration: 1.5 }, 10.2)
      .to(narrative3Ref.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, 10.4)

    // Phase 7: Pantone card shifts right. Narrative 3 exits Up. CTA pulls up to left.
    tl.to(figmaRef.current, { x: "25vw", duration: 1.5 }, 12.0)
      .to(narrative3Ref.current, { opacity: 0, y: -100, duration: 1.5 }, 12.0)
      .to(ctaRef.current, { opacity: 1, y: 0, x: "-20vw", duration: 1.5 }, 12.2)

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="relative w-full bg-[var(--bg-base)]">
      {/* Scroll track height: Determines how long the scroll experience is */}
      <div ref={scrollRef} className="h-[1000vh] w-full relative">
        
        {/* Fixed Container for animations */}
        <div 
          ref={containerRef}
          className="fixed top-0 left-0 w-full h-screen overflow-hidden pointer-events-none flex items-center justify-center"
        >
          {/* Aurora Lighting Background */}
          <div className="aurora-bg"></div>
          
          {/* LOGO EXPLOSION FIELD (Hidden initially, scatters on scroll) */}
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              ref={(el) => { explosionRefs.current[i] = el; }}
              className="absolute z-0 pointer-events-none text-[3rem] md:text-[6rem] leading-none opacity-0"
            >
              <MorphingLogo variant="exploded" />
            </div>
          ))}

          {/* MAIN LOGO - Initial opening, shrinks and disappears */}
          <div ref={logoRef} className="absolute z-1 pointer-events-none text-[8rem] md:text-[15rem] leading-none">
             <MorphingLogo variant={isScrolled ? "embossed" : "main"} />
          </div>

          {/* CHOREOGRAPHY ELEMENTS (All centered initially, moved via GSAP) */}
          
          <div ref={typewriterRef} className="absolute z-10 pointer-events-auto">
            <TypewriterText 
              startTyping={true}
              lines={TYPEWRITER_LINES} 
            />
          </div>

          <div ref={compassRef} className="absolute z-10 pointer-events-auto opacity-0 scale-75 md:scale-100">
            <Compass tiltMode={compassTiltMode} />
          </div>

          <div ref={narrative1aRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              title="A Leap of Faith"
              paragraphs={[
                "Every monumental space begins with a solitary leap of faith. A line drawn across a blank canvas."
              ]}
            />
          </div>

          <div ref={narrative1bRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              paragraphs={[
                "A quiet intuition about how morning light should trace the edge of a load-bearing wall, or how a space might dictate the rhythm of the lives lived around it."
              ]}
            />
          </div>

          <div ref={dioramaRef} className="absolute z-10 pointer-events-auto">
            <VideoDiorama />
          </div>

          <div ref={narrative2aRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              title="The Expanse of the Void"
              paragraphs={[
                "Between the initial spark of creativity and the pouring of concrete lies an expanse of the void."
              ]}
            />
          </div>

          <div ref={narrative2bRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              paragraphs={[
                "When you are too close to the canvas, blind spots emerge, not from a lack of skill, but from an excess of passion."
              ]}
            />
          </div>
          <div ref={figmaRef} className="absolute z-30 pointer-events-auto scale-110">
            <PantoneEyesCard />
          </div>

          <div ref={narrative3Ref} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              paragraphs={[
                "Keep your eyes on the prize."
              ]}
            />
          </div>

          <div ref={ctaRef} className="absolute z-40 pointer-events-auto flex flex-col items-center gap-8">
            <p className="font-inter text-lg text-[var(--text-muted)] max-w-md text-center mb-6">
              Seeking counsel is never a surrender of your vision. 
            </p>
            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-6">
                <Link href="/login" className="btn-sos-filled">
                  Login
                </Link>
              </div>
              <p className="font-display text-sm md:text-base text-[var(--text-faint)] tracking-[0.2em] uppercase">
                Find a Compass
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
