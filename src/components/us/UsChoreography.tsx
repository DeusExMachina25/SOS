"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PantoneEyesCard from "../home/PantoneEyesCard";
import FacadeSectionCut from "./FacadeSectionCut";
import VeneerStack from "./VeneerStack";
import VettingColumns from "./VettingColumns";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Manifesto pillars — 4 slots, load-bearing in the pinned temple sequence
 * below. "Organic execution" and "Calibration without compromise" said the
 * same thing twice ("we adapt" / "we refine, we don't reduce"), so they're
 * merged into one. The freed slot goes to the vetting standard, echoing
 * Genesis beat 003 and the VettingColumns graphic above.
 */
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
    title: "Secure collaboration.",
    description: "Your intellectual property is sacred. Our secure vaults and end-to-end encrypted sessions ensure your ideas stay unequivocally yours."
  },
  {
    short: "Standard.",
    title: "Measured on what stands.",
    description: "Every expert here is vetted on built work, not portfolios of intent — permits cleared, projects delivered, peers who'll vouch for them before they take a single session."
  }
];

const EDITORIAL_POSTS = [
  {
    title: "The Art of the Second Opinion",
    date: "May 28, 2026",
    category: "Strategy",
    excerpt:
      "Asking someone to poke holes in your work is not an admission that it's broken. It's how you find out which parts actually hold."
  },
  {
    title: "Finding True North in Chaotic Markets",
    date: "May 15, 2026",
    category: "Growth",
    excerpt:
      "Every competitor is shouting a different direction. Here's how we help founders tune that out and pick a heading they can defend."
  },
  {
    title: "Why Minimalist Architecture Scales Better",
    date: "April 30, 2026",
    category: "Tech",
    excerpt:
      "The systems that survive their own success are rarely the clever ones. They're the ones with fewer moving parts to begin with."
  }
];

/**
 * The Genesis, rebuilt. "The Observation" is gone — the blind-spot argument
 * belongs to the Home page now, and repeating it here cost the section its
 * job, which is proving the collective is worth trusting.
 */
const GENESIS_BEATS = [
  {
    index: "001",
    eyebrow: "Why we built it",
    title: "Every render hides a section.",
    content:
      "We built a place where the second opinion is the product, not an upsell — free of the jargon and generic templates of traditional consulting."
  },
  {
    index: "002",
    eyebrow: "The collective",
    title: "Invited, not listed.",
    content:
      "Strategy, architecture, design and execution. Every expert here is invited, not listed — vetted on built work before they take a single session."
  },
  {
    index: "003",
    eyebrow: "The standard",
    title: "Measured on what stands.",
    content:
      "No portfolios of intent. We look at what was permitted, what was built, and what is still standing — then we ask the people who worked alongside them."
  }
];

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
  
  const editorialCardsRef = useRef<(HTMLElement | null)[]>([]);
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

    // Editorial cards stagger in as the row comes into view
    editorialCardsRef.current.forEach((card, i) => {
      if (!card) return;
      gsap.fromTo(card,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: i * 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

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

          <div className="flex flex-col w-full">
            {GENESIS_BEATS.map((beat, index) => (
              <div
                key={beat.index}
                ref={(el) => { genesisNodesRef.current[index] = el; }}
                className="w-full border-t border-[var(--border-strong)] pt-10 md:pt-14 pb-20 md:pb-28"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-10 md:gap-16">

                  {/* Left rail: index, eyebrow, headline, body */}
                  <div className="md:w-[38%] shrink-0 flex flex-col">
                    <div className="flex items-baseline gap-4 mb-8">
                      <span className="font-mono-sos text-[10px] tracking-[0.4em] text-[var(--color-orange)]">
                        {beat.index}
                      </span>
                      <span className="font-mono-sos text-[10px] tracking-[0.4em] uppercase text-[var(--text-faint)]">
                        {beat.eyebrow}
                      </span>
                    </div>

                    <h3 className="font-display text-3xl md:text-5xl font-normal mb-8 text-[var(--text-primary)] tracking-tighter leading-[0.95]">
                      {beat.title}
                    </h3>

                    <p className="font-inter text-[var(--text-muted)] text-base md:text-lg leading-relaxed font-light">
                      {beat.content}
                    </p>
                  </div>

                  {/* Right: the graphic that carries the argument */}
                  <div className="md:w-[62%] w-full">
                    {index === 0 && <FacadeSectionCut />}
                    {index === 1 && <VeneerStack />}
                    {index === 2 && <VettingColumns />}
                  </div>

                </div>
              </div>
            ))}
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
          Keep your eyes on the prize.
        </h3>

        {/* The Pantone Eyes Card */}
        <div className="flex justify-center w-full py-8 z-10 relative">
          <PantoneEyesCard />
        </div>

        {/* Text Below */}
        <p className="font-inter text-lg md:text-xl text-[var(--text-muted)] max-w-md mt-8 z-10 relative text-center">
          Seeking counsel is never a surrender of your vision.
        </p>

      </section>

      {/* 4. Editorial: writing from the collective */}
      <section className="w-full px-6 py-32 md:py-48 bg-[var(--bg-base)] border-t border-[var(--border)] z-10 relative">
        <div className="container mx-auto max-w-6xl">

          <div className="flex flex-col items-center justify-center text-center mb-20 md:mb-28">
            <h2 className="font-display text-4xl md:text-6xl font-normal text-[var(--text-primary)] mb-6 tracking-tight">
              Editorial.
            </h2>
            <p className="font-mono-sos text-[10px] tracking-[0.3em] text-[var(--text-muted)] uppercase mb-8">
              Thinking out loud
            </p>
            <div className="w-px h-16 bg-[var(--border-strong)] mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {EDITORIAL_POSTS.map((post, index) => (
              <article
                key={post.title}
                ref={(el) => { editorialCardsRef.current[index] = el; }}
                className="group flex flex-col text-left cursor-pointer"
              >
                <div className="h-52 mb-7 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] relative overflow-hidden transition-colors duration-500 group-hover:border-[var(--border-strong)]">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-tr from-[var(--color-primary)]/12 to-transparent"></div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono-sos text-[9px] tracking-[0.2em] uppercase text-[var(--color-orange)]">
                    {post.category}
                  </span>
                  <span className="font-mono-sos text-[9px] tracking-[0.15em] text-[var(--text-faint)]">
                    {post.date}
                  </span>
                </div>

                <h3 className="font-display text-2xl md:text-[26px] leading-tight text-[var(--text-primary)] mb-4 tracking-tight transition-colors duration-300 group-hover:text-[var(--color-primary)]">
                  {post.title}
                </h3>

                <p className="font-inter text-sm text-[var(--text-muted)] leading-relaxed font-light mb-6">
                  {post.excerpt}
                </p>

                <span className="font-mono-sos text-[10px] tracking-[0.2em] uppercase text-[var(--text-primary)] border-b border-[var(--border-strong)] pb-2 w-max transition-colors duration-300 group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)]">
                  Read on &rarr;
                </span>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* 5. Let's Talk: Perfectly Centered with Massive Gap */}
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
