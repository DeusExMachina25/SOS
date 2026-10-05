"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ParallaxBoxes from "@/components/ParallaxBoxes";
import FieldPie, { type FieldKey } from "@/components/platter/FieldPie";
import { supabase } from "@/utils/supabase/client";
import { submitInquiry } from "@/lib/inquiries";
import { formatInr } from "@/lib/data/format";

const ANGLE_FONTS = [
  "font-futuristic",
  "font-editorial",
  "font-display",
  "font-inter",
  "font-mono-sos",
];

const ANGLE_COLORS = [
  "text-[var(--color-primary)]", // Main Purple / Primary
  "text-[var(--color-orange)]",  // Portland Orange
  "text-[var(--color-green)]",   // June Bud
  "text-[var(--text-primary)]",  // White/Base
  "text-[var(--color-secondary)]", // White Chocolate
];

interface ExpertProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  expert_role?: string;
  bio?: string;
  /** Portrait from `public_experts.avatar_url`; a monogram is shown when absent. */
  avatar_url?: string | null;
  /** Flat price of a 60-minute session, in rupees, from public_experts. */
  session_rate_inr?: number | null;
  tags?: string[];
  disciplines?: { id: string; title: string; desc: string }[];
  /* Which pie segment this expert sits under. No column for this exists in
     `profiles` yet, so it travels with the hardcoded metadata below. */
  field?: FieldKey;
}

/**
 * One expert per division. Prices are not stored here: they come from each
 * expert's `session_rate_inr` in the database.
 */
const DEFAULT_EXPERTS: ExpertProfile[] = [
  {
    id: "789e4567-e89b-12d3-a456-426614174000",
    full_name: "Shravani Reddy",
    phone: "+919876543210",
    email: "shravani@sos.com",
    role: "expert",
    field: "architecture",
    expert_role: "Principal Architect & Interior Designer",
    bio: "Two decades of independent residential practice across town and country — from interiors and spatial flow in urban apartments, to structural planning and material selection on ground-up builds, to master planning across rural and peri-urban plots.",
    tags: ["RESIDENTIAL ARCHITECTURE", "INTERIOR DESIGN", "MASTER PLANNING"],
    disciplines: [
      { id: "01", title: "Interiors & Spatial Flow", desc: "How a city footprint should actually be used — circulation, storage logic, and material honesty, room by room." },
      { id: "02", title: "Site & Structural Strategy", desc: "Reading the plot, load paths, and foundations before a single wall is drawn, then detailing junctions that age well." },
      { id: "03", title: "Master Planning & Compliance", desc: "Contours, drainage, and phased development across larger plots — planned so it survives contact with approval." }
    ]
  },
  {
    id: "789e4567-e89b-12d3-a456-426614174001",
    full_name: "Sudhamshu Reddy",
    phone: "+919876543211",
    email: "sudhamshu@sos.com",
    role: "expert",
    field: "sustainability",
    expert_role: "Renewable Systems Engineer",
    bio: "Renewable energy, waste systems, and additive manufacturing — designed into a project from the start rather than retrofitted onto a finished one.",
    tags: ["RENEWABLE SYSTEMS", "WASTE MANAGEMENT", "3D PRINTING"],
    disciplines: [
      { id: "01", title: "Renewable Systems", desc: "Solar, storage, and load planning sized to what the building actually draws." },
      { id: "02", title: "Waste Management", desc: "Segregation, composting, and water recovery designed in, not bolted on." },
      { id: "03", title: "Additive Manufacturing", desc: "3D-printed components and formwork — and when printing is the wrong answer." }
    ]
  },
  {
    id: "789e4567-e89b-12d3-a456-426614174002",
    full_name: "Yasasvi Jampana",
    phone: "+919876543212",
    email: "yasasvi@sos.com",
    role: "expert",
    field: "travel",
    expert_role: "Travel Experience Curator",
    bio: "Curated travel — routing and pacing built around the places actually worth stopping for, and the ground logistics that decide whether the trip holds together.",
    tags: ["ITINERARY DESIGN", "ROUTE PLANNING", "CURATED STAYS"],
    disciplines: [
      { id: "01", title: "Route & Pacing", desc: "How far to move each day, and when the answer is to stay put." },
      { id: "02", title: "Curated Stays", desc: "Choosing places worth the detour rather than the ones with the best rating." },
      { id: "03", title: "Ground Logistics", desc: "Permits, transfers, and the parts of a trip that quietly go wrong." }
    ]
  }
];

/**
 * Portraits for experts, keyed by lower-case full name. Drop the image into
 * `public/experts/` (portrait crop, about 1200 x 1500, JPG or WebP) and add a
 * line here, e.g.  "shravani reddy": "/experts/shravani-reddy.jpg".
 * A photo set on the expert in the database (`avatar_url`) always wins; with
 * neither, the page shows a monogram.
 */
const EXPERT_PHOTOS: Record<string, string> = {};

function withPhotos(list: ExpertProfile[]): ExpertProfile[] {
  return list.map((e) => ({
    ...e,
    avatar_url: e.avatar_url || EXPERT_PHOTOS[e.full_name.trim().toLowerCase()] || null,
  }));
}

export default function PlatterPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(true);
  const [selectedExpertId, setSelectedExpertId] = useState<string>("");

  // State for individual letter styles
  const [letterStyles, setLetterStyles] = useState<{font: string, color: string}[]>(
    Array(5).fill({ font: ANGLE_FONTS[0], color: ANGLE_COLORS[0] })
  );
  // UI state for the collapsible per-expert accordions
  const [openSections, setOpenSections] = useState<{ [expertId: string]: { disciplines: boolean; terms: boolean } }>({});

  // Contact form
  const [inquiryState, setInquiryState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inquiryError, setInquiryError] = useState("");

  const handleInquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    setInquiryState("sending");
    setInquiryError("");

    const result = await submitInquiry(new FormData(form), "platter");
    if (!result.ok) {
      setInquiryState("error");
      setInquiryError(result.error);
      return;
    }

    form.reset();
    setInquiryState("sent");
  };

  const toggleSection = (expertId: string, section: "disciplines" | "terms") => {
    setOpenSections(prev => {
      const expertState = prev[expertId] || { disciplines: false, terms: false };
      return {
        ...prev,
        [expertId]: {
          ...expertState,
          [section]: !expertState[section]
        }
      };
    });
  };

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

  useEffect(() => {
    async function loadExperts() {
      if (!supabase) {
        setExperts(withPhotos(DEFAULT_EXPERTS));
        setSelectedExpertId(DEFAULT_EXPERTS[0].id);
        setLoadingExperts(false);
        return;
      }
      try {
        // Reads the public view, not `profiles` directly: RLS restricts that
        // table to authenticated users, and this is a public page. The view
        // also exposes only id + full_name, so no contact details reach the
        // browser.
        const { data, error } = await supabase
          .from("public_experts")
          .select("id, full_name, professional_title, bio, avatar_url, specialties, session_rate_inr");
        if (error) throw error;
        if (data && data.length > 0) {
          const curated = new Map(
            DEFAULT_EXPERTS.map((e) => [e.full_name.trim().toLowerCase(), e])
          );
          const merged: ExpertProfile[] = data.map((p) => {
            const base = curated.get(p.full_name.trim().toLowerCase());
            return {
              phone: null,
              email: null,
              role: "expert",
              ...base,
              id: p.id,
              full_name: p.full_name,
              expert_role: p.professional_title || base?.expert_role,
              bio: p.bio || base?.bio,
              avatar_url: p.avatar_url,
              session_rate_inr: p.session_rate_inr,
              tags: p.specialties?.length
                ? p.specialties.map((s: string) => s.toUpperCase())
                : base?.tags,
            };
          });
          setExperts(withPhotos(merged));
          setSelectedExpertId(merged[0].id);
        } else {
          setExperts(withPhotos(DEFAULT_EXPERTS));
          setSelectedExpertId(DEFAULT_EXPERTS[0].id);
        }
      } catch (err) {
        console.error("Error loading experts", err);
        setExperts(withPhotos(DEFAULT_EXPERTS));
        setSelectedExpertId(DEFAULT_EXPERTS[0].id);
      } finally {
        setLoadingExperts(false);
      }
    }
    loadExperts();
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

      <div style={{ height: "15vh" }} aria-hidden="true" />

      {/* Main Container for the rest of the page */}
      <div className="container mx-auto px-6 max-w-6xl flex flex-col items-center text-center pb-[20vh]">

        {/* Main Platter Header */}
        <header ref={addToRefs} className="flex flex-col items-center w-full">
          <h1 className="font-editorial text-7xl md:text-9xl text-[var(--text-primary)] mb-8 tracking-tighter drop-shadow-lg">The Platter</h1>
          <p className="font-inter text-xl text-[var(--text-muted)] max-w-2xl font-light leading-relaxed">
            A curated roster across three active divisions, each vetted on delivered work, available for a single honest session on your project.
          </p>
        </header>

        <div style={{ height: "15vh" }} aria-hidden="true" />

        {/* Expanded Expert Profile - Moved to Top */}
        <section ref={addToRefs} className="w-full flex flex-col items-center">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} The Collective</h2>
          
          {loadingExperts ? (
            <div className="w-full max-w-5xl flex flex-col items-center animate-pulse">
              {/* Field selector skeleton — one slice per field, not per expert */}
              <div className="w-full max-w-[520px] mb-12 flex flex-col items-center gap-4">
                <div className="w-full aspect-[460/320] bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl" />
                <div className="h-3 w-40 bg-[var(--bg-surface-2)] rounded" />
              </div>
              {/* Active Section Skeleton */}
              <div className="w-full flex flex-col md:flex-row gap-12 items-center md:items-start text-left bg-[var(--bg-surface)] border border-[var(--border)] rounded-[40px] p-10 md:p-16 shadow-2xl backdrop-blur-md">
                <div className="w-64 h-[420px] bg-[var(--bg-surface-2)] rounded-3xl border border-[var(--border)] flex-shrink-0" />
                <div className="flex flex-col flex-1 w-full space-y-6">
                  <div className="h-16 bg-[var(--bg-surface-2)] rounded-xl w-3/4" />
                  <div className="h-4 bg-[var(--bg-surface-2)] rounded-lg w-1/4" />
                  <div className="space-y-3 w-full">
                    <div className="h-4 bg-[var(--bg-surface-2)] rounded-lg w-full" />
                    <div className="h-4 bg-[var(--bg-surface-2)] rounded-lg w-5/6" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 bg-[var(--bg-surface-2)] rounded-full w-24" />
                    <div className="h-8 bg-[var(--bg-surface-2)] rounded-full w-24" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-5xl flex flex-col items-center">
              
              {/* Field selector — picking an expert drives the profile card below */}
              <FieldPie
                experts={experts}
                selectedExpertId={selectedExpertId}
                onSelect={(id) => {
                  setSelectedExpertId(id);
                  // bring the profile into view, otherwise picking an expert looks like it did nothing
                  requestAnimationFrame(() =>
                    document.getElementById("expert-profile")?.scrollIntoView({
                      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                      block: "start",
                    })
                  );
                }}
              />

              {/* Spacious Active Profile Details Card */}
              {(() => {
                const activeExpert = experts.find((e) => e.id === selectedExpertId) || experts[0];
                if (!activeExpert) return null;
                return (
                  <div key={activeExpert.id} id="expert-profile" className="w-full scroll-mt-28 flex flex-col gap-16 items-center md:items-start text-left bg-[var(--bg-surface)] border border-[var(--border)] rounded-[40px] p-10 md:p-16 shadow-2xl backdrop-blur-md">
                    
                    <div className="w-full flex flex-col lg:flex-row gap-16 items-center lg:items-start">
                      
                      {/* Portrait: the real photo when one is on file, otherwise a monogram. */}
                      <div className="w-full max-w-sm lg:w-[350px] h-[480px] bg-[var(--bg-surface-2)] rounded-[32px] border border-[var(--border-strong)] flex-shrink-0 relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 shadow-lg">
                        <div
                          role="img"
                          aria-label={`${activeExpert.full_name}, ${activeExpert.expert_role ?? "expert"}`}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                        >
                          <span className="font-editorial text-[9rem] leading-none text-[var(--text-primary)] opacity-80 select-none">
                            {activeExpert.full_name
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0]?.toUpperCase())
                              .join("")}
                          </span>
                          <span className="font-mono-sos text-xs uppercase tracking-[0.25em] text-[var(--text-muted)] px-6 text-center">
                            {activeExpert.expert_role}
                          </span>
                        </div>
                        {activeExpert.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={activeExpert.avatar_url}
                            src={activeExpert.avatar_url}
                            alt={`Portrait of ${activeExpert.full_name}`}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={(ev) => {
                              ev.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] to-transparent opacity-60 pointer-events-none" />
                      </div>

                      {/* Profile Information */}
                      <div className="flex flex-col flex-1">
                        <h3 className="font-editorial text-6xl md:text-8xl leading-none mb-6 text-[var(--text-primary)] tracking-tight">
                          {activeExpert.full_name}
                        </h3>
                        <div className="font-mono-sos text-sm text-[var(--color-primary)] mb-8 tracking-[0.25em] uppercase font-semibold">
                          {activeExpert.expert_role}
                        </div>
                        <p className="font-inter text-[var(--text-muted)] text-xl leading-relaxed mb-8 max-w-3xl font-light">
                          {activeExpert.bio}
                        </p>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-3 mb-10">
                          {activeExpert.tags?.map((tag, idx) => (
                            <span key={idx} className="text-[10px] font-mono-sos border border-[var(--border)] px-4 py-2 text-[var(--text-muted)] rounded-full bg-[var(--bg-base)]/40 tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <button 
                          onClick={() => {
                            localStorage.setItem("platter_selected_expert", activeExpert.id);
                            router.push("/login");
                          }}
                          className="text-[var(--text-primary)] font-mono-sos text-sm hover:text-[var(--color-primary)] transition-colors border-b border-[var(--text-primary)] pb-2 w-max tracking-[0.2em] text-left"
                        >
                          SECURE SLOT &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Professional Brutalist Accordion System */}
                    {/* Professional Brutalist Accordion System */}
                    <div className="w-full mt-10 border-t border-[var(--border)]">
                      
                      {/* Accordion Item 1: Core Disciplines */}
                      <div>
                        <button
                          onClick={() => toggleSection(activeExpert.id, "disciplines")}
                          className={`w-full py-8 flex items-center justify-between text-left group cursor-pointer focus:outline-none border-b transition-all duration-300 ${
                            openSections[activeExpert.id]?.disciplines 
                              ? "border-[var(--color-green)] bg-gradient-to-r from-[var(--color-green)]/3 to-transparent px-4" 
                              : "border-[var(--border)] hover:border-[var(--color-green)]/40 hover:px-2"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-editorial text-3xl md:text-4xl tracking-tight text-[var(--text-primary)]">
                              Areas of Influence
                            </span>
                            <span className="font-mono-sos text-[9px] tracking-[0.2em] text-[var(--text-muted)] uppercase mt-2 opacity-60">
                              Core operational capabilities and tactical deliverables
                            </span>
                          </div>
                          <div className="relative w-8 h-8 flex items-center justify-center">
                            <div className={`absolute w-4 h-[1px] transition-colors duration-300 ${
                              openSections[activeExpert.id]?.disciplines ? "bg-[var(--color-green)]" : "bg-[var(--text-muted)] group-hover:bg-[var(--text-primary)]"
                            }`}></div>
                            <div className={`absolute h-4 w-[1px] transition-all duration-500 ${
                              openSections[activeExpert.id]?.disciplines ? "bg-[var(--color-green)] rotate-90 opacity-0" : "bg-[var(--text-muted)] group-hover:bg-[var(--text-primary)] rotate-0"
                            }`}></div>
                          </div>
                        </button>
                        
                        {/* Collapsible Content */}
                        <div className={`grid transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${openSections[activeExpert.id]?.disciplines ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                          <div className="overflow-hidden">
                            <div className="md:pl-16 pb-12 pt-8">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {activeExpert.disciplines?.map((service, i) => {
                                  const cardColors = [
                                    { border: "border-t-[var(--color-green)]", text: "text-[var(--color-green)]", bg: "hover:bg-[var(--color-green)]/5" },
                                    { border: "border-t-[var(--color-orange)]", text: "text-[var(--color-orange)]", bg: "hover:bg-[var(--color-orange)]/5" },
                                    { border: "border-t-[var(--color-primary)]", text: "text-[var(--color-primary)]", bg: "hover:bg-[var(--color-primary)]/5" }
                                  ];
                                  const colorSet = cardColors[i] || cardColors[0];
                                  return (
                                    <div key={i} className={`flex flex-col justify-between p-6 bg-[var(--bg-surface-2)] border border-[var(--border)] border-t-4 ${colorSet.border} rounded-2xl transition-all duration-500 group shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-[var(--border-strong)]/40 cursor-default`}>
                                      <div>
                                        <div className={`font-mono-sos text-[9px] ${colorSet.text} tracking-[0.2em] uppercase mb-3 font-semibold`}>{"//"} STAGE 0{i+1}</div>
                                        <h4 className="font-editorial text-2xl text-[var(--text-primary)] tracking-tight mb-3 transition-colors duration-300">{service.title}</h4>
                                      </div>
                                      <p className="font-inter text-xs text-[var(--text-muted)] leading-relaxed mt-2 font-light">{service.desc}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })()}
            </div>
          )}
        </section>

        <div style={{ height: "15vh" }} aria-hidden="true" />

        {/* How Booking Works — three plain steps, no accordion to open first */}
        <section ref={addToRefs} className="w-full flex flex-col items-center">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} How Booking Works</h2>
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 text-left">
            {[
              { id: "01", title: "Choose", desc: "Pick an expert whose work matches your project." },
              { id: "02", title: "Brief", desc: "Upload drawings and references to a private vault before the session." },
              { id: "03", title: "Meet", desc: "Secure video, one hour, with payment held in escrow until it's done." }
            ].map((step) => (
              <div key={step.id} className="flex flex-col border-t-2 border-[var(--border-strong)] pt-6">
                <span className="font-mono-sos text-[10px] tracking-[0.3em] text-[var(--color-orange)] mb-4">{step.id}</span>
                <h3 className="font-editorial text-3xl text-[var(--text-primary)] tracking-tight mb-3">{step.title}</h3>
                <p className="font-inter text-sm text-[var(--text-muted)] leading-relaxed font-light">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={{ height: "15vh" }} aria-hidden="true" />

        {/* Investment: one flat rate per expert, taken from the same record the
            checkout charges, so the price shown is always the price paid. */}
        <section ref={addToRefs} className="w-full flex flex-col items-center">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} Investment</h2>

          <div className="w-full max-w-3xl text-left">
            <p className="font-inter text-sm font-light text-[var(--text-muted)] mb-7">
              One flat rate per 60-minute session, set by each expert. The price you see here is the price you pay.
            </p>

            <ul className="border border-[var(--border-strong)] rounded-[10px] overflow-hidden bg-[var(--bg-surface-2)]">
              {experts.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 md:p-6 border-b border-[var(--border-strong)] last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-editorial text-[22px] font-light text-[var(--text-primary)] leading-tight">
                      {e.full_name}
                    </div>
                    <div className="font-mono-sos text-[10px] tracking-[0.14em] uppercase text-[var(--text-muted)] mt-1">
                      {e.expert_role}
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="font-editorial text-[30px] font-normal text-[var(--text-primary)] leading-none tracking-tight">
                      {e.session_rate_inr ? formatInr(e.session_rate_inr) : "On request"}
                    </div>
                    {e.session_rate_inr ? (
                      <div className="font-mono-sos text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] mt-1">
                        per 60 min
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem("platter_selected_expert", e.id);
                      router.push("/login");
                    }}
                    className="btn-sos shrink-0 sm:min-w-[9rem]"
                  >
                    Book session
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-4 border-t border-[var(--border)] w-full text-left">
              <div className="font-inter text-xs text-[var(--text-muted)] font-light">
                A written summary is delivered within 48 hours of every session.
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: "15vh" }} aria-hidden="true" />

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

        <div style={{ height: "10vh" }} aria-hidden="true" />

        {/* Let's Talk Contact Form */}
        <section ref={addToRefs} className="w-full border-t border-[var(--border)] bg-[var(--bg-base)] z-10 relative py-24">
          <div className="w-full flex flex-col items-center">
            {/* Centered Text Section */}
            <div className="mb-16 flex flex-col items-center w-full max-w-4xl text-center">
              <h2 className="font-display text-5xl md:text-7xl font-normal mb-12 text-[var(--text-primary)] tracking-tight">
                Let&apos;s Talk.
              </h2>
              
              <div className="relative flex flex-col items-center mb-8 w-full">
                {/* Massive ambient quote mark behind the text */}
                <div className="font-editorial text-[10rem] md:text-[12rem] text-[var(--text-primary)] opacity-[0.03] leading-none absolute -top-16 select-none pointer-events-none">
                  &ldquo;
                </div>
                <p className="font-editorial text-xl md:text-3xl text-[var(--text-primary)] opacity-90 leading-tight font-normal italic max-w-3xl mx-auto relative z-10">
                  &ldquo;Every relationship begins with a great idea...&rdquo;
                </p>
              </div>

              <p className="font-inter text-base md:text-lg text-[var(--text-muted)] leading-relaxed font-light max-w-xl mx-auto mb-12">
                You bring the ideas, we build a great relation and the ship sets sail. Drop us a line below to initiate the dialogue.
              </p>
              <div className="w-px h-16 bg-[var(--border-strong)] mx-auto"></div>
            </div>

            {/* Fully Centered Contact Form (Single Column) */}
            <div className="w-full max-w-xl mx-auto flex flex-col items-center relative z-20">
              <form
                className="w-full flex flex-col items-center gap-y-12 relative"
                onSubmit={handleInquiry}
              >
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Leave this field empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>
                <div className="relative group w-full text-center">
                  <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-3 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    aria-label="Full name"
                    maxLength={200}
                    required
                    className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-2 text-[var(--text-primary)] font-inter text-lg focus:outline-none focus:border-[var(--text-primary)] transition-colors rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 text-center"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="relative group w-full text-center">
                  <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-3 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">E-mail *</label>
                  <input
                    type="email"
                    name="email"
                    aria-label="Email"
                    maxLength={320}
                    required
                    className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-2 text-[var(--text-primary)] font-inter text-lg focus:outline-none focus:border-[var(--text-primary)] transition-colors rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 text-center"
                    placeholder="jane@example.com"
                  />
                </div>

                <div className="relative group w-full text-center">
                  <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-3 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    aria-label="Subject"
                    maxLength={300}
                    className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-2 text-[var(--text-primary)] font-inter text-lg focus:outline-none focus:border-[var(--text-primary)] transition-colors rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 text-center"
                    placeholder="Project Inquiry"
                  />
                </div>

                <div className="relative group w-full text-center">
                  <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-3 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">Message *</label>
                  <textarea
                    rows={1}
                    name="message"
                    aria-label="Message"
                    maxLength={5000}
                    required
                    className="w-full bg-transparent border-b border-[var(--border-strong)] px-0 py-2 text-[var(--text-primary)] font-inter text-lg focus:outline-none focus:border-[var(--text-primary)] transition-colors resize-none rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 min-h-[100px] text-center"
                    placeholder="Tell us about your vision..."
                  ></textarea>
                </div>

                <div className="flex items-center justify-center mt-2 w-full">
                  <input 
                    type="checkbox" 
                    id="privacy" 
                    required 
                    className="w-4 h-4 rounded-sm border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] focus:ring-[var(--text-primary)] focus:ring-offset-0 focus:ring-offset-[var(--bg-base)] cursor-pointer"
                  />
                  <label htmlFor="privacy" className="ml-3 font-inter text-sm text-[var(--text-muted)] cursor-pointer select-none">
                    I acknowledge the <a href="/privacy" target="_blank" rel="noopener" className="text-[var(--text-primary)] underline underline-offset-4 transition-colors">privacy policy</a>.
                  </label>
                </div>

                <div className="mt-8 text-center w-full flex flex-col items-center gap-4">
                  <button
                    type="submit"
                    disabled={inquiryState === "sending"}
                    className="bg-[var(--text-primary)] text-[var(--bg-base)] font-mono-sos text-xs tracking-[0.3em] px-12 py-4 uppercase hover:opacity-80 transition-opacity duration-300 w-full md:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                  >
                    {inquiryState === "sending" ? "Sending…" : "Submit Inquiry"}
                  </button>

                  <p
                    role="status"
                    aria-live="polite"
                    className={`font-inter text-sm min-h-[20px] ${
                      inquiryState === "error" ? "text-[var(--color-orange)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {inquiryState === "sent" && "Thanks — we've got it. We'll reply within two working days."}
                    {inquiryState === "error" && inquiryError}
                  </p>
                </div>

              </form>
            </div>
          </div>
        </section>

        <div style={{ height: "6vh" }} aria-hidden="true" />

      </div>
    </div>
  );
}
