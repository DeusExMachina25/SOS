"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MorphingLogo from "../home/MorphingLogo";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// 1. Reordered Manifesto Pillars
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

const TIMELINE_MILESTONES = [
  {
    year: "Phase 01",
    title: "The Observation.",
    content: "Founders and creators often hit a wall not because they lack passion or skill, but because they are simply too close to the canvas. In the pursuit of building something meaningful, blind spots are inevitable."
  },
  {
    year: "Phase 02",
    title: "The Sanctuary.",
    content: "We established this platform as a sanctuary for ideas. A place where the art of the second opinion is revered, free from the noise, jargon, and generic templates of traditional consulting."
  },
  {
    year: "Phase 03",
    title: "The Collective.",
    content: "Our collective of experts spanning strategy, architecture, design, and execution came together—all dedicated to helping you find your true north in a chaotic market."
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
      { from: { x: 140, y: 140 }, to: { x: 20, y: 20 }, color: '#EF9F27' },
      { from: { x: 20, y: 20 }, to: { x: 140, y: 20 }, color: '#5DCAA5' },
      { from: { x: 140, y: 20 }, to: { x: 20, y: 140 }, color: '#7F77DD' },
      { from: { x: 20, y: 140 }, to: { x: 20, y: 20 }, color: '#D85A30' },
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
        l.setAttribute('marker-end', 'url(#ah)');
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
    <div className="flex justify-center w-full py-8 pointer-events-none z-10 relative">
      <svg viewBox="0 0 160 160" className="overflow-visible w-48 h-48 md:w-72 md:h-72">
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <g ref={linesRef} id="lines"></g>
        <g id="dots">
          {[
            { cx: 20, cy: 20 }, { cx: 60, cy: 20 }, { cx: 100, cy: 20 },
            { cx: 20, cy: 60 }, { cx: 60, cy: 60 }, { cx: 100, cy: 60 },
            { cx: 20, cy: 100 }, { cx: 60, cy: 100 }, { cx: 100, cy: 100 },
          ].map((dot, i) => (
            <circle key={i} cx={dot.cx} cy={dot.cy} r="4" fill="var(--text-primary)" opacity="0.8" />
          ))}
        </g>
        <circle ref={pencilRef} id="pencil" r="4" fill="none" stroke="#EF9F27" strokeWidth="2" opacity="0" />
      </svg>
    </div>
  );
}

export default function UsChoreography() {
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const heroImageRef = useRef<HTMLImageElement>(null);
  
  // Genesis Refs
  const genesisSectionRef = useRef<HTMLDivElement>(null);
  const genesisNodesRef = useRef<(HTMLDivElement | null)[]>([]);
  
  // Temple Refs
  const templeSectionRef = useRef<HTMLDivElement>(null);
  const templeCenterTextsRef = useRef<(HTMLDivElement | null)[]>([]);
  const templePillarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const templePillarTitlesRef = useRef<(HTMLDivElement | null)[]>([]);
  const templeRoofRef = useRef<HTMLDivElement>(null);
  const templeRoofTextRef = useRef<HTMLDivElement>(null);
  const horizontalTextsRef = useRef<HTMLDivElement>(null); // The row of text boxes at the end
  
  const formRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mouse Parallax Setup
    const heroXTo = gsap.quickTo(heroImageRef.current, "x", { duration: 0.8, ease: "power3.out" });
    const heroYTo = gsap.quickTo(heroImageRef.current, "y", { duration: 0.8, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = e.clientX / window.innerWidth - 0.5;
      const centerY = e.clientY / window.innerHeight - 0.5;
      
      heroXTo(centerX * 50); 
      heroYTo(centerY * 50);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Hero Text Reveal
    gsap.fromTo(heroTextRef.current, 
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 2, ease: "power3.out", delay: 0.3 }
    );

    // Genesis Nodes Fade In (Tightened spacing)
    genesisNodesRef.current.forEach((node) => {
      if (!node) return;
      gsap.fromTo(node,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: node,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    // 2. Temple Builder Pinned Sequence
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

    // Quote Animation
    if (quoteRef.current) {
      gsap.fromTo(quoteRef.current,
        { opacity: 0, y: 50, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: quoteRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    // Form Animation
    if (formRef.current) {
      gsap.fromTo(formRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: formRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="relative w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-inter selection:bg-[var(--text-primary)] selection:text-[var(--bg-base)] overflow-hidden">
      
      {/* 1. Hero Banner */}
      <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[var(--bg-base)]">
          <Image 
            ref={heroImageRef}
            src="/assets/us_hero_banner.png" 
            alt="Hero Banner" 
            fill
            className="object-cover opacity-30 select-none pointer-events-none scale-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-base)]/80 to-[var(--bg-base)]"></div>
        </div>
        <div className="relative z-10 text-center flex flex-col items-center justify-center mt-20">
          <h1 
            ref={heroTextRef} 
            className="font-editorial text-[6rem] md:text-[10rem] lg:text-[14rem] font-normal tracking-tight uppercase text-[var(--text-primary)] leading-none"
          >
            US
          </h1>
          <p className="mt-12 font-mono-sos text-[10px] md:text-xs tracking-[0.4em] text-[var(--text-muted)] uppercase">
            The Anatomy of a Second Opinion
          </p>
        </div>
      </section>

      {/* 2. The Genesis: Cleaned Up ZigZag Layout */}
      <section ref={genesisSectionRef} className="w-full px-6 py-32 md:py-48 relative border-t border-[var(--border)] z-10 mt-16">
        
        <div className="container mx-auto max-w-7xl relative z-10 translate-x-[5vh]">
          
          <div className="flex flex-col items-center justify-center text-center mb-24 md:mb-32">
            <h2 className="font-display text-4xl md:text-6xl font-normal text-[var(--text-primary)] mb-6 tracking-tight">The Genesis.</h2>
            <p className="font-mono-sos text-[10px] tracking-[0.3em] text-[var(--text-muted)] uppercase mb-8">How we arrived here</p>
            <div className="w-px h-16 bg-[var(--border-strong)] mx-auto"></div>
          </div>

          <div className="flex flex-col gap-12 md:gap-16 w-full">
            {TIMELINE_MILESTONES.map((item, index) => {
              // Alternating: left, right, left
              const isEven = index % 2 === 0;
              return (
                <div 
                  key={index} 
                  ref={(el) => { genesisNodesRef.current[index] = el; }}
                  className={`w-full flex ${isEven ? 'justify-start md:pl-[10vw]' : 'justify-end md:pr-[10vw]'}`}
                >
                  <div className={`w-full md:w-[45%] flex flex-col ${isEven ? 'items-start text-left' : 'items-end text-right'}`}>
                    <div className="font-mono-sos text-[10px] text-[var(--text-muted)] mb-6 tracking-[0.4em] uppercase">
                      [ {item.year} ]
                    </div>
                    <h3 className="font-display text-3xl md:text-5xl font-normal mb-6 text-[var(--text-primary)] tracking-tight">
                      {item.title}
                    </h3>
                    <p className="font-inter text-[var(--text-muted)] text-lg md:text-xl leading-relaxed font-light w-full">
                      {item.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 3. The Manifesto: Pinned Temple Builder */}
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

      {/* Empty Transition Space */}
      <section className="w-full h-[150vh] bg-[var(--bg-base)] z-10 relative border-t border-[var(--border)] flex flex-col items-center justify-center overflow-hidden">
        
        {/* Text Above */}
        <h3 className="font-display text-2xl md:text-3xl text-[var(--text-primary)] opacity-80 uppercase tracking-tight mb-4 z-10 relative text-center">
          Don&apos;t just think it...
        </h3>

        {/* The Nine Dot Loop SVG Animation */}
        <NineDotLoop />

        {/* Text Below */}
        <h3 className="font-display text-2xl md:text-4xl text-[var(--text-primary)] tracking-tight mt-8 z-10 relative uppercase text-center flex items-center justify-center gap-3 flex-wrap">
          We Prefer to <div className="inline-flex scale-75 md:scale-100 mx-[-0.5rem]"><MorphingLogo text="ACT" variant="embossed" /></div> Outside the Box
        </h3>

      </section>

      {/* 4. Let's Talk: Perfectly Centered with Massive Gap */}
      <section className="w-full border-t border-[var(--border)] bg-[var(--bg-base)] z-10 relative">
        <div className="container mx-auto px-6 pt-[100vh] pb-40 md:pt-[200vh] md:pb-64 w-full flex flex-col items-center">
          
          {/* Centered Text Section */}
          <div className="mb-24 md:mb-32 flex flex-col items-center w-full max-w-4xl text-center">
            <h2 className="font-display text-5xl md:text-7xl font-normal mb-24 text-[var(--text-primary)] tracking-tight">
              Let&apos;s Talk.
            </h2>
            
            <div ref={quoteRef} className="relative flex flex-col items-center mb-16 w-full">
              {/* Massive ambient quote mark behind the text */}
              <div className="font-editorial text-[10rem] md:text-[15rem] text-[var(--text-primary)] opacity-[0.03] leading-none absolute -top-20 md:-top-32 select-none pointer-events-none">
                &ldquo;
              </div>
              <p className="font-editorial text-2xl md:text-4xl text-[var(--text-primary)] opacity-90 leading-tight font-normal italic max-w-3xl mx-auto relative z-10">
                &ldquo;Every relationship begins with a great idea...&rdquo;
              </p>
            </div>

            <p className="font-inter text-lg md:text-xl text-[var(--text-muted)] leading-relaxed font-light max-w-xl mx-auto mb-20">
              You bring the ideas, we build a great relation and the ship sets sail. Drop us a line below to initiate the dialogue.
            </p>
            <div className="w-px h-24 bg-[var(--border-strong)] mx-auto"></div>
          </div>

          {/* Fully Centered Contact Form (Single Column) */}
          <div ref={formRef} className="w-full max-w-xl mx-auto flex flex-col items-center relative z-20">
            <form className="w-full flex flex-col items-center gap-y-16">
              
              <div className="relative group w-full text-center">
                <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-4 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">Full Name *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-3 text-[var(--text-primary)] font-inter text-xl focus:outline-none focus:border-[var(--text-primary)] transition-colors rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 text-center"
                  placeholder="Jane Doe"
                />
              </div>

              <div className="relative group w-full text-center">
                <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-4 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">E-mail *</label>
                <input 
                  type="email" 
                  required 
                  className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-3 text-[var(--text-primary)] font-inter text-xl focus:outline-none focus:border-[var(--text-primary)] transition-colors rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 text-center"
                  placeholder="jane@example.com"
                />
              </div>

              <div className="relative group w-full text-center">
                <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-4 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">Subject</label>
                <input 
                  type="text" 
                  className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-3 text-[var(--text-primary)] font-inter text-xl focus:outline-none focus:border-[var(--text-primary)] transition-colors rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 text-center"
                  placeholder="Project Inquiry"
                />
              </div>

              <div className="relative group w-full text-center">
                <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-4 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">Message *</label>
                <textarea 
                  rows={1}
                  required 
                  className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-3 text-[var(--text-primary)] font-inter text-xl focus:outline-none focus:border-[var(--text-primary)] transition-colors resize-none rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 min-h-[120px] text-center"
                  placeholder="Tell us about your vision..."
                ></textarea>
              </div>

              <div className="flex items-center justify-center mt-4 w-full">
                <input 
                  type="checkbox" 
                  id="privacy" 
                  required 
                  className="w-4 h-4 rounded-sm border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] focus:ring-[var(--text-primary)] focus:ring-offset-0 focus:ring-offset-[var(--bg-base)] cursor-pointer"
                />
                <label htmlFor="privacy" className="ml-4 font-inter text-sm text-[var(--text-muted)] cursor-pointer select-none">
                  I acknowledge the <a href="#" className="text-[var(--text-primary)] hover:underline transition-colors">privacy policy</a>.
                </label>
              </div>

              <div className="mt-12 text-center w-full">
                <button type="submit" className="bg-[var(--text-primary)] text-[var(--bg-base)] font-mono-sos text-xs tracking-[0.3em] px-16 py-6 uppercase hover:opacity-80 transition-opacity duration-300 w-full md:w-auto">
                  Submit Inquiry
                </button>
              </div>

            </form>
          </div>
        </div>
      </section>

    </div>
  );
}
