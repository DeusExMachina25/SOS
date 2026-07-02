"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

import MorphingLogo from "../home/MorphingLogo";
import Compass from "../home/Compass";
import TypewriterText from "../home/TypewriterText";
import MinimalStoryBox from "../home/MinimalStoryBox";
import PantoneEyesCard from "../home/PantoneEyesCard";
import InteractiveNineDot from "../home/InteractiveNineDot";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const TYPEWRITER_LINES = [
  { text: "The Art", colorClass: "text-[var(--text-primary)] font-special-elite" },
  { text: "of", colorClass: "text-[var(--text-muted)] pl-4 md:pl-12 font-special-elite" },
  { text: "Second Opinions", colorClass: "text-[var(--color-primary)] pl-8 md:pl-24 font-special-elite" }
];

const MANIFESTO_PILLARS = [
  {
    short: "Organic.",
    title: "Organic execution.",
    description: "Frameworks shouldn't be cages. We adapt to the natural rhythm of your project, allowing it to grow organically rather than forcing it into rigid, predefined boxes."
  },
  {
    short: "Clarity.",
    title: "Clarity over complexity.",
    description: "In an ocean of noise, we prioritize signal. We strip away the unnecessary until only the essential truth of your vision remains, architecting foundations that endure."
  },
  {
    short: "Security.",
    title: "Secure collaboration.",
    description: "Your intellectual property is sacred. Our secure vaults and end-to-end encrypted sessions ensure your ideas stay unequivocally yours."
  },
  {
    short: "Calibration.",
    title: "Calibration without compromise.",
    description: "Seeking a second opinion isn't about diluting your idea. It's about sharpening the edge so it cuts through the market flawlessly. We refine, we don't reduce."
  }
];

function NineDotLoop() {
  const linesRef = useRef<SVGGElement>(null);
  const pencilRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!linesRef.current || !pencilRef.current) return;

    const linesG = linesRef.current;
    const pencil = pencilRef.current;

    interface Segment {
      from: { x: number; y: number };
      to: { x: number; y: number };
      color: string;
    }

    const segments: Segment[] = [
      { from: { x: 140, y: 140 }, to: { x: 20, y: 20 }, color: '#FF5B2E' },
      { from: { x: 20, y: 20 }, to: { x: 140, y: 20 }, color: '#B8CF4F' },
      { from: { x: 140, y: 20 }, to: { x: 20, y: 140 }, color: '#7C4DFF' },
      { from: { x: 20, y: 140 }, to: { x: 20, y: 20 }, color: '#2A0089' },
    ];

    const ctx = gsap.context(() => {
      function makeLine(seg: Segment) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', String(seg.from.x));
        l.setAttribute('y1', String(seg.from.y));
        l.setAttribute('x2', String(seg.from.x));
        l.setAttribute('y2', String(seg.from.y));
        l.setAttribute('stroke', seg.color);
        l.setAttribute('stroke-width', '2');
        l.setAttribute('stroke-linecap', 'round');
        l.setAttribute('marker-end', 'url(#ah_homus)');
        linesG.appendChild(l);
        return l;
      }

      function runCycle() {
        linesG.innerHTML = '';
        const lines = segments.map(makeLine);
        gsap.set(pencil, { attr: { cx: segments[0].from.x, cy: segments[0].from.y, opacity: 1 } });

        const tl = gsap.timeline({
          onComplete: () => {
            gsap.to(pencil, {
              attr: { opacity: 0 }, duration: 0.3, onComplete: () => {
                gsap.delayedCall(0.5, runCycle);
              }
            });
          }
        });

        segments.forEach((seg, i) => {
          tl.to(lines[i], {
            attr: { x2: seg.to.x, y2: seg.to.y },
            duration: 1.0,
            ease: 'power2.inOut',
          }, i === 0 ? '+=0.3' : '+=0.15');
          tl.to(pencil, {
            attr: { cx: seg.to.x, cy: seg.to.y },
            duration: 1.0,
            ease: 'power2.inOut'
          }, '<');
        });
      }

      runCycle();
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex justify-center w-full py-4 pointer-events-none z-10 relative">
      <svg viewBox="0 0 160 160" className="overflow-visible w-40 h-40 md:w-56 md:h-56">
        <defs>
          <marker id="ah_homus" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <g ref={linesRef} id="lines_homus"></g>
        <g id="dots_homus">
          {[
            { cx: 20, cy: 20 }, { cx: 60, cy: 20 }, { cx: 100, cy: 20 },
            { cx: 20, cy: 60 }, { cx: 60, cy: 60 }, { cx: 100, cy: 60 },
            { cx: 20, cy: 100 }, { cx: 60, cy: 100 }, { cx: 100, cy: 100 },
          ].map((dot, i) => (
            <circle key={i} cx={dot.cx} cy={dot.cy} r="4" fill="var(--text-primary)" opacity="0.8" />
          ))}
        </g>
        <circle ref={pencilRef} id="pencil_homus" r="4" fill="none" stroke="#FF5B2E" strokeWidth="2" opacity="0" />
      </svg>
    </div>
  );
}

export default function HomusChoreography() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Component Refs for GSAP
  const typewriterRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const interactiveNineDotRef = useRef<HTMLDivElement>(null);
  
  // Narratives
  const narrative1aRef = useRef<HTMLDivElement>(null);
  const narrative1bRef = useRef<HTMLDivElement>(null);
  const narrative2aRef = useRef<HTMLDivElement>(null);
  const narrative3Ref = useRef<HTMLDivElement>(null);
  const narrative3bRef = useRef<HTMLDivElement>(null);
  
  // Temple Refs
  const templeContainerRef = useRef<HTMLDivElement>(null);
  const templeRoofRef = useRef<HTMLDivElement>(null);
  const templeRoofTextRef = useRef<HTMLDivElement>(null);
  const templePillarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const templePillarTitlesRef = useRef<(HTMLDivElement | null)[]>([]);
  const templeCenterTextsRef = useRef<(HTMLDivElement | null)[]>([]);
  const horizontalTextsRef = useRef<HTMLDivElement>(null);

  // validation / Loop elements
  const figmaRef = useRef<HTMLDivElement>(null);
  const nineDotLoopRef = useRef<HTMLDivElement>(null);
  const nineDotLoopTextRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const explosionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [compassTiltMode, setCompassTiltMode] = useState<'2d'|'2.5d'|'3d'>('2d');

  useEffect(() => {
    if (!scrollRef.current) return;

    // Reset components to initial states
    const els = [
      typewriterRef, compassRef, interactiveNineDotRef, figmaRef, ctaRef,
      narrative1aRef, narrative1bRef, narrative2aRef, narrative3Ref, narrative3bRef,
      templeContainerRef, nineDotLoopRef, nineDotLoopTextRef
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

    // Reset temple pieces specifically
    templePillarsRef.current.forEach(el => {
      if (el) gsap.set(el, { scaleY: 0, transformOrigin: "bottom" });
    });
    templePillarTitlesRef.current.forEach(el => {
      if (el) gsap.set(el, { opacity: 0 });
    });
    templeCenterTextsRef.current.forEach(el => {
      if (el) gsap.set(el, { opacity: 0, y: 30 });
    });
    if (templeRoofRef.current) {
      gsap.set(templeRoofRef.current, { scaleX: 0, transformOrigin: "center", opacity: 0 });
    }
    if (templeRoofTextRef.current) {
      gsap.set(templeRoofTextRef.current, { opacity: 0, y: 10 });
    }
    if (horizontalTextsRef.current) {
      gsap.set(horizontalTextsRef.current, { opacity: 0, y: 20 });
    }

    // Create a master timeline locked to scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
        onUpdate: (self) => {
          setIsScrolled(self.progress > 0.01);
          // Timeline duration ~27.5s.
          // Compass tilts from 2D -> 2.5D (Phase 2, around 2.0s -> ~0.07 progress)
          // Tilts to 3D (Phase 4, around 6.0s -> ~0.21 progress)
          if (self.progress > 0.21) setCompassTiltMode('3d');
          else if (self.progress > 0.07) setCompassTiltMode('2.5d');
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
      
    // Phase 2: Typewriter exits left, Compass shifts left, Narrative 1a (Observation/Creative Wall) enters right
    tl.to(typewriterRef.current, { opacity: 0, x: "-50vw", duration: 1.5 }, 2.0)
      .to(compassRef.current, { x: "-20vw", duration: 1.5 }, 2.0) 
      .to(narrative1aRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, 2.2);

    // Phase 3: Compass moves Right, Narrative 1a exits Left, Interactive Nine-Dot Puzzle enters Left
    tl.to(narrative1aRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, 4.0)
      .to(compassRef.current, { x: "20vw", duration: 1.5 }, 4.0)
      .to(interactiveNineDotRef.current, { opacity: 1, y: 0, x: "-20vw", duration: 1.5 }, 4.2);

    // Phase 4: Interactive Nine-Dot exits Left. Compass shifts Left. Narrative 1b (Sanctuary) enters Right.
    tl.to(interactiveNineDotRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, 6.0)
      .to(compassRef.current, { x: "-20vw", duration: 1.5 }, 6.0)
      .to(narrative1bRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, 6.2);

    // Phase 5: Compass & Narrative 1b exit. Narrative 2a (The Expanse of the Void) enters Right.
    tl.to(compassRef.current, { opacity: 0, x: "80vw", duration: 1.5 }, 8.0)
      .to(narrative1bRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, 8.0)
      .to(narrative2aRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, 8.2);

    // Phase 6: Temple Builder Sequence (10.0s to 18.0s)
    // Narrative 2a exits left, Temple Container fades in.
    tl.to(narrative2aRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, 10.0)
      .to(templeContainerRef.current, { opacity: 1, duration: 1.5 }, 10.0);

    // Build the Temple Pillars
    MANIFESTO_PILLARS.forEach((pillar, i) => {
      const startTime = 10.5 + i * 1.5;
      const centerTextEl = templeCenterTextsRef.current[i];
      const pillarEl = templePillarsRef.current[i];
      const titleEl = templePillarTitlesRef.current[i];

      tl.to(centerTextEl, { opacity: 1, y: 0, duration: 0.8 }, startTime)
        .to(pillarEl, { scaleY: 1, duration: 1.2, ease: "power2.out" }, startTime)
        .to(titleEl, { opacity: 1, duration: 0.6 }, startTime + 0.4)
        .to(centerTextEl, { opacity: 0, y: -30, duration: 0.8 }, startTime + 1.2);
    });

    // Drop the Roof
    const roofTime = 16.5; 
    tl.to(templeRoofRef.current, { scaleX: 1, opacity: 1, duration: 1.2, ease: "power3.out" }, roofTime)
      .to(templeRoofTextRef.current, { opacity: 1, y: 0, duration: 0.8 }, roofTime + 0.4)
      .to(horizontalTextsRef.current, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, roofTime + 0.6);

    // Fade out temple container
    const templeEndTime = 18.5;
    tl.to(templeContainerRef.current, { opacity: 0, y: -100, duration: 1.5 }, templeEndTime);

    // Phase 7: Validation Card 3 & 3b (Google Eyes) (19.5s to 22.0s)
    // Card 3 enters right, Pantone Eyes card (Figma component) enters left.
    const figmaCardTime = 19.5;
    tl.to(narrative3Ref.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, figmaCardTime)
      .to(figmaRef.current, { opacity: 1, y: 0, x: "-25vw", duration: 1.5 }, figmaCardTime + 0.2);

    // Transition Card 3 to Card 3b (Experts)
    const card3bTime = 21.5;
    tl.to(narrative3Ref.current, { opacity: 0, x: "-80vw", duration: 1.2 }, card3bTime)
      .to(narrative3bRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, card3bTime + 0.3);

    // Phase 8: NineDotLoop transition (23.5s to 25.5s)
    // Card 3b exits right, NineDotLoop SVG enters left, Loop Text enters right.
    // Figma card (Google Eyes) stays fixed at -25vw!
    const loopTime = 23.5;
    tl.to(narrative3bRef.current, { opacity: 0, x: "80vw", duration: 1.5 }, loopTime)
      .to(nineDotLoopRef.current, { opacity: 1, y: 0, x: "-20vw", duration: 1.5 }, loopTime + 0.2)
      .to(nineDotLoopTextRef.current, { opacity: 1, y: 0, x: "20vw", duration: 1.5 }, loopTime + 0.4);

    // Phase 9: Final Login CTA pulls up (26.0s to 27.5s)
    // Loop graphics and loop text fade out, Pantone Eyes stays fixed, CTA enters left.
    const ctaTime = 26.0;
    tl.to(nineDotLoopRef.current, { opacity: 0, x: "-80vw", duration: 1.5 }, ctaTime)
      .to(nineDotLoopTextRef.current, { opacity: 0, y: -100, duration: 1.5 }, ctaTime)
      .to(ctaRef.current, { opacity: 1, y: 0, x: "-20vw", duration: 1.5 }, ctaTime + 0.2);

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="relative w-full bg-[var(--bg-base)]">
      {/* Scroll track height: Determines how long the scroll experience is */}
      <div ref={scrollRef} className="h-[1600vh] w-full relative">
        
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

          {/* Interactive Nine-Dot Puzzle (Replaces VideoDiorama in scroll flow) */}
          <div ref={interactiveNineDotRef} className="absolute z-30 pointer-events-auto opacity-0 scale-90 md:scale-100">
            <InteractiveNineDot />
          </div>

          {/* Story Cards */}
          <div ref={narrative1aRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              title="The Creative Wall"
              paragraphs={[
                "Founders and creators often hit a wall not because they lack passion or skill, but because they are simply too close to the canvas. In the pursuit of building something meaningful, blind spots are inevitable.",
                "Our work is born from a personal belief that every great vision deserves a clear, uncompromised calibration."
              ]}
            />
          </div>

          <div ref={narrative1bRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              title="The Sanctuary"
              paragraphs={[
                "We established this platform as a sanctuary for ideas. A place where the art of the second opinion is revered, free from the noise, jargon, and generic templates of traditional consulting."
              ]}
            />
          </div>

          <div ref={narrative2aRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              title="The Expanse of the Void"
              paragraphs={[
                "Between the initial spark of creativity and the pouring of concrete lies an expanse of the void."
              ]}
            />
          </div>

          {/* Temple Builder DOM elements (Manifesto) */}
          <div ref={templeContainerRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-0">
            {/* Story Center Texts */}
            <div className="absolute top-[8%] md:top-[12%] left-0 w-full px-6 flex justify-center z-20">
              <div className="relative w-full max-w-4xl h-[18vh] flex items-center justify-center text-center">
                {MANIFESTO_PILLARS.map((pillar, index) => (
                  <div 
                    key={index} 
                    ref={(el) => { templeCenterTextsRef.current[index] = el; }}
                    className="absolute inset-0 flex flex-col items-center justify-center opacity-0"
                  >
                    <div className="font-mono-sos text-[10px] text-[var(--text-muted)] tracking-[0.4em] mb-2 uppercase">
                      Pillar 0{index + 1}
                    </div>
                    <h3 className="font-display text-2xl md:text-5xl font-normal text-[var(--text-primary)] tracking-tight leading-tight">
                      {pillar.title}
                    </h3>
                  </div>
                ))}
              </div>
            </div>

            {/* Architectural Visuals (Roof + Pillars) */}
            <div className="absolute top-[35%] md:top-[30%] left-1/2 -translate-x-1/2 w-full max-w-6xl flex flex-col items-center px-4 md:px-12 z-10 h-[32vh] md:h-[38vh]">
              {/* Roof */}
              <div 
                ref={templeRoofRef}
                className="w-full h-16 md:h-24 border-2 border-[var(--border-strong)] bg-[var(--bg-surface-2)] backdrop-blur-xl flex items-center justify-center relative z-20 shadow-2xl"
              >
                 <div 
                   ref={templeRoofTextRef}
                   className="font-futuristic text-xl md:text-3xl text-[var(--text-primary)] tracking-widest uppercase opacity-90"
                 >
                   The Manifesto
                 </div>
              </div>

              {/* Pillars */}
              <div className="w-full flex justify-between px-2 md:px-12 -mt-[2px] h-full flex-grow">
                {MANIFESTO_PILLARS.map((pillar, i) => (
                  <div 
                    key={i}
                    ref={(el) => { templePillarsRef.current[i] = el; }}
                    className="w-[20%] md:w-[15%] h-full border-l-2 border-r-2 border-b-2 border-[var(--border-strong)] bg-[var(--bg-surface)] backdrop-blur-sm relative flex flex-col items-center justify-center"
                  >
                    <div 
                      ref={(el) => { templePillarTitlesRef.current[i] = el; }}
                      className="font-display text-[9px] md:text-lg text-[var(--text-primary)] text-center tracking-tight px-1 opacity-0"
                    >
                      {pillar.short}
                    </div>
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-[var(--text-primary)] opacity-5"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Horizontal Footer Texts */}
            <div 
              ref={horizontalTextsRef}
              className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-full max-w-6xl px-4 md:px-16 flex justify-between items-start h-[20vh] pb-4 z-20 opacity-0"
            >
              {MANIFESTO_PILLARS.map((pillar, i) => (
                <div key={i} className="w-[22%] md:w-[18%] flex flex-col items-center text-center">
                  <div className="font-mono-sos text-[8px] md:text-[9px] text-[var(--text-primary)] tracking-[0.2em] uppercase mb-2 opacity-50">
                    Pillar 0{i + 1}
                  </div>
                  <p className="font-inter text-[9px] md:text-xs text-[var(--text-muted)] leading-relaxed font-light hidden md:block">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Pantone Card (Google Eyes) Validation */}
          <div ref={figmaRef} className="absolute z-30 pointer-events-auto scale-100 md:scale-110">
            <PantoneEyesCard />
          </div>

          <div ref={narrative3Ref} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              paragraphs={[
                "Keep your eyes on the prize."
              ]}
            />
          </div>

          <div ref={narrative3bRef} className="absolute z-20 pointer-events-auto">
            <MinimalStoryBox 
              paragraphs={[
                "Our collective of experts spanning strategy, architecture, design, and execution came together—all dedicated to helping you find your true north in a chaotic market."
              ]}
            />
          </div>

          {/* NineDotLoop SVG loop transition */}
          <div ref={nineDotLoopRef} className="absolute z-20 pointer-events-auto opacity-0">
             <NineDotLoop />
          </div>

          <div ref={nineDotLoopTextRef} className="absolute z-20 pointer-events-auto opacity-0 max-w-lg text-center">
            <h3 className="font-display text-2xl md:text-4xl text-[var(--text-primary)] tracking-tight uppercase flex items-center justify-center gap-3 flex-wrap leading-tight">
              We Prefer to <div className="inline-flex scale-75 md:scale-90"><MorphingLogo text="ACT" variant="embossed" /></div> Outside the Box
            </h3>
          </div>

          {/* Final CTA */}
          <div ref={ctaRef} className="absolute z-40 pointer-events-auto flex flex-col items-center gap-8">
            <p className="font-inter text-lg text-[var(--text-muted)] max-w-md text-center mb-6">
              Seeking counsel is never a surrender of your vision. It is the calibration of it.
            </p>
            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-6">
                <Link href="/login" className="btn-sos-filled">
                  Login
                </Link>
                <Link href="/platter" className="btn-sos">
                  View Platter ↗
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
