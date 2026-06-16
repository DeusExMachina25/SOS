"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ParallaxBoxes from "@/components/ParallaxBoxes";

const ANGLE_FONTS = [
  "font-futuristic",
  "font-editorial",
  "font-display",
  "font-inter",
  "font-mono-sos",
];

const ANGLE_COLORS = [
  "text-[var(--color-primary)]", // Main Purple
  "text-[var(--color-cyan)]",    // Cyan
  "text-[#ff4081]",              // Pink
  "text-[var(--text-primary)]",  // White/Base
  "text-[#ffff00]",              // Neon Yellow
];

export default function PlatterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  
  // State for individual letter styles
  const [letterStyles, setLetterStyles] = useState<{font: string, color: string}[]>(
    Array(5).fill({ font: ANGLE_FONTS[0], color: ANGLE_COLORS[0] })
  );
  // UI States for Pricing
  // Accordion removed per new tile layout design

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    sectionsRef.current.forEach((section) => {
      if (section) {
        gsap.fromTo(
          section,
          { opacity: 0, y: 100 },
          {
            opacity: 1,
            y: 0,
            duration: 1.5,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              toggleActions: "play none none reverse"
            }
          }
        );
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  // Per-letter chaotic cycling effect & Box Color
  useEffect(() => {
    const interval = setInterval(() => {
      setLetterStyles(
        Array(5).fill(null).map(() => ({
          font: ANGLE_FONTS[Math.floor(Math.random() * ANGLE_FONTS.length)],
          color: ANGLE_COLORS[Math.floor(Math.random() * ANGLE_COLORS.length)],
        }))
      );
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  return (
    <div className="w-full pt-20 md:pt-32 pb-32 flex flex-col items-center relative" ref={containerRef}>
      <div className="aurora-bg"></div>
      {/* Brutalist Luxury Hero Section */}
      <section 
        ref={addToRefs}
        className="relative w-full overflow-hidden border-b border-[var(--border)] py-[15vh] md:py-[20vh] px-4 flex flex-col items-center justify-center"
      >
        <div className="absolute top-[10%] left-[5%] md:left-[15%] opacity-30 pointer-events-none w-48 h-48 bg-[var(--bg-surface-2)] rounded-sm transform rotate-12 backdrop-blur-3xl border border-[var(--border-strong)] animate-[spin_60s_linear_infinite]"></div>
        <div className="absolute bottom-[20%] right-[5%] md:right-[15%] opacity-20 pointer-events-none w-64 h-32 bg-[var(--bg-surface)] rounded-sm transform -rotate-6 backdrop-blur-3xl border border-[var(--border)] animate-[pulse_10s_ease-in-out_infinite]"></div>

        <div className="relative w-24 h-24 mt-[10vh] z-10 flex items-center justify-center hover:rotate-90 hover:scale-110 transition-all duration-700 cursor-default">
          <div className="absolute top-0 left-0 w-16 h-16 bg-transparent border border-[var(--text-muted)] rounded-full"></div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-transparent border border-[var(--text-primary)] rounded-full animate-[pulse_4s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-transparent border border-[var(--text-primary)] rounded-full animate-[pulse_4s_ease-in-out_infinite_2s]"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-transparent border border-[var(--text-muted)] rounded-full"></div>
        </div>

        {/* Hero text pushed down by 80vh */}
        <div className="text-center z-10 flex flex-col items-center max-w-6xl mx-auto mt-[80vh] mb-[20vh]">
          <div className="font-editorial text-[7vw] md:text-7xl leading-[1.1] text-[var(--text-primary)] tracking-tight drop-shadow-2xl">
            APPROACHING PROJECTS FROM
          </div>
          <div className="font-editorial text-[7vw] md:text-7xl leading-[1.1] text-[var(--text-primary)] tracking-tight drop-shadow-2xl flex flex-wrap items-center justify-center gap-4 mt-6">
            A DIFFERENT 
            <span className="font-bold inline-flex transform rotate-[-4deg] scale-x-[-1] origin-center -translate-y-2 drop-shadow-[0_0_15px_rgba(179,136,255,0.5)] animate-[pulse_3s_ease-in-out_infinite] hover:scale-110 hover:rotate-[4deg] transition-all duration-500 cursor-default">
              {"ANGLE".split("").map((letter, i) => (
                <span 
                  key={i} 
                  className={`${letterStyles[i]?.font} ${letterStyles[i]?.color} transition-all duration-300`}
                >
                  {letter}
                </span>
              ))}
            </span>
          </div>
        </div>
      </section>

      <div style={{ height: "30vh" }} aria-hidden="true" />

      {/* Main Container for the rest of the page */}
      <div className="container mx-auto px-6 max-w-6xl flex flex-col items-center text-center pb-[20vh]">

        {/* Main Platter Header */}
        <header ref={addToRefs} className="flex flex-col items-center w-full">
          <h1 className="font-editorial text-7xl md:text-9xl text-[var(--text-primary)] mb-8 tracking-tighter drop-shadow-lg">The Platter</h1>
          <p className="font-inter text-xl text-[var(--text-muted)] max-w-2xl font-light leading-relaxed">
            A curated selection of expert consultations designed to elevate your brand, strategy, and execution.
          </p>
        </header>

        <div style={{ height: "30vh" }} aria-hidden="true" />

        {/* Minimalist Specials List */}
        <section ref={addToRefs} className="w-full max-w-4xl flex flex-col">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12 text-center">Core Disciplines</h2>
          <div className="flex flex-col w-full border-t border-[var(--border)]">
            {[
              { id: "01", title: "Architectural Strategy", desc: "Defining your true north and narrative framework." },
              { id: "02", title: "Technical Planning", desc: "Building scalable and robust digital foundations." },
              { id: "03", title: "Urban Design", desc: "Crafting extremely beautiful, cohesive user experiences." },
            ].map((service, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-baseline justify-between py-12 border-b border-[var(--border)] group hover:bg-[var(--bg-surface)] transition-colors px-6">
                <div className="flex items-baseline gap-6 mb-4 md:mb-0">
                  <span className="font-mono-sos text-xs text-[var(--text-muted)]">{service.id}</span>
                  <h3 className="font-display font-bold text-3xl md:text-5xl text-[var(--text-primary)] tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{service.title}</h3>
                </div>
                <p className="font-inter text-sm text-[var(--text-muted)] max-w-xs md:text-right font-light leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={{ height: "30vh" }} aria-hidden="true" />

        {/* Expanded Expert Profile */}
        <section ref={addToRefs} className="w-full flex flex-col items-center">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-16">The Architects</h2>
          <div className="w-full max-w-5xl flex flex-col md:flex-row gap-16 md:gap-24 items-center md:items-start text-left">
            <div className="w-64 h-80 bg-[var(--bg-surface-2)] rounded-sm border border-[var(--border)] flex-shrink-0 relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-700">
              {/* placeholder image */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] to-transparent opacity-80" />
            </div>
            <div className="flex flex-col flex-1">
              <h3 className="font-editorial text-5xl md:text-7xl mb-4 text-[var(--text-primary)]">Dr. V. Architect</h3>
              <div className="font-mono-sos text-sm text-[var(--color-primary)] mb-8 tracking-widest uppercase">Chief Urban Strategist</div>
              <p className="font-inter text-[var(--text-muted)] text-lg leading-relaxed mb-8 max-w-2xl font-light">
                Specializing in macro-level technical architecture and foundational brand frameworks. Bringing a decade of stark, minimalist problem-solving to the most complex digital environments.
              </p>
              <div className="flex flex-wrap gap-4 mb-12">
                <span className="text-xs font-mono-sos border border-[var(--border)] px-4 py-2 text-[var(--text-muted)]">SYSTEMS DESIGN</span>
                <span className="text-xs font-mono-sos border border-[var(--border)] px-4 py-2 text-[var(--text-muted)]">SCALABILITY</span>
                <span className="text-xs font-mono-sos border border-[var(--border)] px-4 py-2 text-[var(--text-muted)]">AESTHETICS</span>
              </div>
              <Link href="/login" className="text-[var(--text-primary)] font-mono-sos text-sm hover:text-[var(--color-primary)] transition-colors border-b border-[var(--text-primary)] pb-2 w-max tracking-widest">
                VIEW FULL DOSSIER &rarr;
              </Link>
            </div>
          </div>
        </section>

        <div style={{ height: "30vh" }} aria-hidden="true" />

        {/* Stark Pricing Model */}
        <section ref={addToRefs} className="w-full max-w-6xl flex flex-col items-center px-4">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-20 text-center">Engagement Terms</h2>
          
          <div className="flex flex-col w-full relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none -z-10">
              <span className="font-editorial text-[50vw] leading-none">₹</span>
            </div>

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-24 z-10">
              <div className="font-mono-sos text-[var(--color-primary)] text-xs tracking-widest uppercase mb-6">Architecture Consulting</div>
              <h3 className="font-editorial text-5xl md:text-7xl text-[var(--text-primary)] mb-6 tracking-tight">Standard Session</h3>
              <p className="font-inter text-[var(--text-muted)] font-light max-w-xl mx-auto text-lg">An intensive, unrelenting 60-minute strategy tear-down and architectural rebuild with our senior experts.</p>
              <div className="font-display text-6xl md:text-8xl font-bold text-[var(--text-primary)] tracking-tighter mt-12">60m</div>
            </div>

            {/* Overlapping Tiles Layout */}
            <div className="flex flex-col md:flex-row justify-center items-center md:items-start w-full z-10 mt-12 mb-12 px-4 md:px-0">
               
               {/* Card 1: Apartment */}
               <div className="flex flex-col justify-between w-full md:w-[350px] h-[380px] bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-sm p-8 shadow-2xl relative z-10 hover:z-40 transform transition-all duration-500 hover:-translate-y-4 mb-8 md:mb-0">
                 <div>
                   <h4 className="font-display text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-6">Apartment</h4>
                   <ul className="flex flex-col gap-3 font-inter text-sm text-[var(--text-muted)]">
                     <li className="flex items-center gap-3"><span className="text-[var(--color-primary)]">✦</span> Spatial Optimization</li>
                     <li className="flex items-center gap-3"><span className="text-[var(--color-primary)]">✦</span> Interior Flow Strategy</li>
                     <li className="flex items-center gap-3"><span className="text-[var(--color-primary)]">✦</span> Material Selection</li>
                   </ul>
                 </div>
                 <div className="mt-6 border border-[var(--border)] py-4 px-6 flex justify-center items-center group-hover:bg-[var(--text-primary)] transition-colors">
                   <span className="font-mono-sos text-[var(--text-primary)] tracking-widest text-sm">₹ 2,499 / BASE</span>
                 </div>
               </div>

               {/* Card 2: Villa */}
               <div className="flex flex-col justify-between w-full md:w-[350px] h-[380px] bg-[var(--text-primary)] border border-transparent rounded-sm p-8 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative z-20 hover:z-40 md:-ml-8 md:translate-y-12 transform transition-all duration-500 hover:-translate-y-4 mb-8 md:mb-0">
                 <div>
                   <h4 className="font-display text-3xl font-bold text-[var(--bg-base)] tracking-tight mb-6 border-b border-black/10 pb-3">Villa</h4>
                   <ul className="flex flex-col gap-3 font-inter text-sm text-[var(--bg-surface-2)]">
                     <li className="flex items-center gap-3"><span className="text-[var(--bg-base)]">✦</span> Architectural Blueprint</li>
                     <li className="flex items-center gap-3"><span className="text-[var(--bg-base)]">✦</span> Landscape Integration</li>
                     <li className="flex items-center gap-3"><span className="text-[var(--bg-base)]">✦</span> Structural Elegance</li>
                   </ul>
                 </div>
                 <div className="mt-6 bg-[var(--bg-base)] border border-transparent py-4 px-6 flex justify-center items-center shadow-lg">
                   <span className="font-mono-sos text-[var(--text-primary)] tracking-widest text-sm">₹ 4,999 / BASE</span>
                 </div>
               </div>

               {/* Card 3: Site Plan */}
               <div className="flex flex-col justify-between w-full md:w-[350px] h-[380px] bg-[var(--color-primary)] border border-[#9b66ff] rounded-sm p-8 shadow-2xl relative z-30 hover:z-40 md:-ml-8 md:translate-y-24 transform transition-all duration-500 hover:-translate-y-4">
                 <div>
                   <h4 className="font-display text-3xl font-bold text-white tracking-tight mb-6 border-b border-white/20 pb-3">Site Plan <span className="text-xs font-normal text-white/70 block mt-2 uppercase tracking-widest font-mono-sos">Up to 1 Acre</span></h4>
                   <ul className="flex flex-col gap-3 font-inter text-sm text-white/90">
                     <li className="flex items-center gap-3"><span className="text-white">✦</span> Master Planning</li>
                     <li className="flex items-center gap-3"><span className="text-white">✦</span> Topographical Layout</li>
                     <li className="flex items-center gap-3"><span className="text-white">✦</span> Zoning Compliance</li>
                   </ul>
                 </div>
                 <div className="mt-6 bg-white py-4 px-6 flex justify-center items-center shadow-lg">
                   <span className="font-mono-sos text-black tracking-widest text-sm font-bold">₹ 7,999 / BASE</span>
                 </div>
               </div>
            </div>

            <div style={{ height: "15vh" }} aria-hidden="true" />

            {/* Separated Add-ons Block */}
            <div className="w-full flex flex-col md:flex-row bg-[var(--bg-surface)] border border-[var(--border)] rounded-sm overflow-hidden z-10 shadow-xl mt-24 md:mt-56 relative opacity-100">
              <div className="p-10 md:p-16 md:w-1/3 border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col justify-center bg-[var(--bg-base)]">
                 <div className="font-mono-sos text-[var(--color-primary)] text-xs uppercase tracking-widest mb-4 font-bold opacity-100">Extensions</div>
                 <div className="font-editorial text-4xl md:text-5xl text-[var(--text-primary)] font-medium opacity-100">+30 Mins</div>
              </div>
              
              <div className="flex flex-col flex-1">
                <div className="flex flex-col md:flex-row justify-between md:items-center p-8 md:px-12 border-b border-[var(--border)] gap-4 md:gap-0 hover:bg-[var(--bg-surface)] transition-colors">
                  <div className="flex flex-col">
                    <span className="font-inter font-bold text-[var(--text-primary)] text-lg opacity-100">Advance Booking</span>
                    <span className="font-inter text-sm text-[var(--text-primary)] mt-1 opacity-90">During initial consultation booking</span>
                  </div>
                  <span className="font-mono-sos text-[var(--color-cyan)] text-xl font-bold opacity-100">40% BASE</span>
                </div>
                <div className="flex flex-col md:flex-row justify-between md:items-center p-8 md:px-12 gap-4 md:gap-0 hover:bg-[var(--bg-surface)] transition-colors">
                  <div className="flex flex-col">
                    <span className="font-inter font-bold text-[var(--text-primary)] text-lg opacity-100">On-Spot Extension</span>
                    <span className="font-inter text-sm text-[var(--text-primary)] mt-1 opacity-90">Requested during active meeting</span>
                  </div>
                  <span className="font-mono-sos text-[#ff4081] text-xl font-bold opacity-100">60% BASE</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        <div style={{ height: "30vh" }} aria-hidden="true" />

        {/* Standalone Secure Slot CTA */}
        <section ref={addToRefs} className="w-full flex flex-col items-center overflow-visible">
           <ParallaxBoxes />
           <Link href="/login" className="w-full max-w-[100vw] px-4 py-24 relative group cursor-pointer overflow-hidden block">
             {/* Secure/Professional Text Animation - Edge to Edge Margins */}
             <div className="relative w-full text-center flex flex-col items-center">
                <h2 className="font-editorial text-[6vw] md:text-[80px] leading-none text-[var(--text-primary)] tracking-tight whitespace-nowrap overflow-visible relative z-10 transition-all duration-1000 transform group-hover:scale-[1.02] group-hover:text-[var(--color-primary)] opacity-100">
                  We&apos;ve got a lot to talk about.
                </h2>
               <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[var(--color-primary)] group-hover:w-[100%] max-w-[800px] transition-all duration-1000 ease-in-out"></div>
             </div>
           </Link>
         </section>

        <div style={{ height: "30vh" }} aria-hidden="true" />



      </div>
    </div>
  );
}
