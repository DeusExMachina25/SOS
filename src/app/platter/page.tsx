"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ParallaxBoxes from "@/components/ParallaxBoxes";
import FieldPie, { type FieldKey } from "@/components/platter/FieldPie";
import { supabase } from "@/utils/supabase/client";

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
  tags?: string[];
  disciplines?: { id: string; title: string; desc: string }[];
  /* Which pie segment this expert sits under. No column for this exists in
     `profiles` yet, so it travels with the hardcoded metadata below. */
  field?: FieldKey;
}

/**
 * All three architects sit in the "architecture" field. Fashion and Travel
 * are surfaced in the field-pie as inactive divisions — no experts, no
 * bookings — until SOS opens those sides of the practice.
 */
const DEFAULT_EXPERTS: ExpertProfile[] = [
  {
    id: "789e4567-e89b-12d3-a456-426614174000",
    full_name: "Shravani Reddy",
    phone: "+919876543210",
    email: "shravani@sos.com",
    role: "expert",
    field: "architecture",
    expert_role: "Principal Architect, Residential",
    bio: "Two decades of independent residential practice — structural planning, material selection, and landscape integration for ground-up builds.",
    tags: ["RESIDENTIAL ARCHITECTURE", "STRUCTURAL PLANNING", "MATERIAL SELECTION"],
    disciplines: [
      { id: "01", title: "Site & Structural Strategy", desc: "Reading the plot, load paths, and foundation strategy before a single wall is drawn." },
      { id: "02", title: "Material & Detailing", desc: "Choosing materials and junctions that age well, not just render well." },
      { id: "03", title: "Landscape Integration", desc: "Tying the built form to the site — light, water, and green cover." }
    ]
  },
  {
    id: "789e4567-e89b-12d3-a456-426614174001",
    full_name: "Karan Malhotra",
    phone: "+919876543211",
    email: "karan@sos.com",
    role: "expert",
    field: "architecture",
    expert_role: "Interior & Spatial Strategist",
    bio: "Specializing in spatial strategy for compact living — flow, storage logic, and material honesty within constrained footprints.",
    tags: ["SPATIAL PLANNING", "INTERIOR FLOW", "MATERIAL HONESTY"],
    disciplines: [
      { id: "01", title: "Spatial Zoning", desc: "Mapping how a small footprint should actually be used, room by room." },
      { id: "02", title: "Flow & Circulation", desc: "Removing the friction between rooms before it becomes a habit." },
      { id: "03", title: "Material Honesty", desc: "Finishes that do their job without pretending to be something else." }
    ]
  },
  {
    id: "789e4567-e89b-12d3-a456-426614174002",
    full_name: "Ananya Sen",
    phone: "+919876543212",
    email: "ananya@sos.com",
    role: "expert",
    field: "architecture",
    expert_role: "Landscape & Site Planning Lead",
    bio: "Master planning and zoning compliance for large-scale plots — topographical reading, phased development, and full site utilisation strategy.",
    tags: ["MASTER PLANNING", "ZONING COMPLIANCE", "TOPOGRAPHY"],
    disciplines: [
      { id: "01", title: "Topographical Reading", desc: "Understanding a site's contours, drainage, and orientation before planning a single structure." },
      { id: "02", title: "Master Planning", desc: "Sequencing what gets built where, and in what order, across a large plot." },
      { id: "03", title: "Zoning & Compliance", desc: "Navigating regulation so the plan survives contact with approval." }
    ]
  }
];

const PRICING_TIERS = {
  apt: {
    num: "Tier 01",
    name: "Apartment",
    priceText: "₹ 2,499 / base",
    price: "₹ 2,499",
    scope: "\u00a0",
    desc: "Focused spatial strategy for compact living — optimising flow, material selection, and interior logic within constrained footprints.",
    feats: ["Spatial optimisation", "Interior flow strategy", "Material selection"],
    color: "#c9a46a",
    gradient: "linear-gradient(145deg, #272420 0%, #3a3228 45%, #2c2720 100%)",
    lineGradient: "linear-gradient(90deg, transparent 5%, #c9a46a 50%, transparent 95%)",
    tagClass: "text-[#c9a46a] bg-[rgba(201,164,106,0.15)]",
    inkClass: "bg-[#c9a46a]"
  },
  vil: {
    num: "Tier 02",
    name: "Villa",
    priceText: "₹ 4,999 / base",
    price: "₹ 4,999",
    scope: "\u00a0",
    desc: "End-to-end architectural development — blueprints, landscape integration, and structural elegance for independent residential builds.",
    feats: ["Architectural blueprint", "Landscape integration", "Structural elegance"],
    color: "#6aaa8c",
    gradient: "linear-gradient(145deg, #192920 0%, #213829 45%, #172318 100%)",
    lineGradient: "linear-gradient(90deg, transparent 5%, #6aaa8c 50%, transparent 95%)",
    tagClass: "text-[#6aaa8c] bg-[rgba(106,170,140,0.15)]",
    inkClass: "bg-[#6aaa8c]"
  },
  sit: {
    num: "Tier 03",
    name: "Site Plan",
    priceText: "₹ 7,999 / base",
    price: "₹ 7,999",
    scope: "Up to 1 acre",
    desc: "Master planning and zoning compliance for large-scale plots — topographical analysis and full site utilisation strategy.",
    feats: ["Master planning", "Topographical layout", "Zoning compliance"],
    color: "#9c7ec4",
    gradient: "linear-gradient(145deg, #201c2c 0%, #2d2438 45%, #1c1826 100%)",
    lineGradient: "linear-gradient(90deg, transparent 5%, #9c7ec4 50%, transparent 95%)",
    tagClass: "text-[#9c7ec4] bg-[rgba(156,126,196,0.15)]",
    inkClass: "bg-[#9c7ec4]"
  }
};

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
  // UI States for Pricing (collapsible per-expert accordions)
  const [openSections, setOpenSections] = useState<{ [expertId: string]: { disciplines: boolean; terms: boolean } }>({});
  const [activeTier, setActiveTier] = useState<"apt" | "vil" | "sit">("apt");

  // Contact form
  const [inquiryState, setInquiryState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inquiryError, setInquiryError] = useState("");

  const handleInquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setInquiryState("sending");
    setInquiryError("");

    if (!supabase) {
      setInquiryState("error");
      setInquiryError("We can't reach the server right now. Email us at hello@sos.com instead.");
      return;
    }

    const { error } = await supabase.from("inquiries").insert({
      full_name: String(data.get("full_name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      subject: String(data.get("subject") ?? "").trim() || null,
      message: String(data.get("message") ?? "").trim(),
      source: "platter",
    });

    if (error) {
      console.error("Inquiry submission failed", error);
      setInquiryState("error");
      setInquiryError("That didn't send. Try again, or email us at hello@sos.com.");
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
        setExperts(DEFAULT_EXPERTS);
        setSelectedExpertId(DEFAULT_EXPERTS[0].id);
        setLoadingExperts(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "expert");
        if (error) throw error;
        if (data && data.length > 0) {
          const merged = data.map((p, idx) => {
            const defaultExp = DEFAULT_EXPERTS[idx] || DEFAULT_EXPERTS[0];
            return {
              ...defaultExp,
              id: p.id,
              full_name: p.full_name,
              email: p.email,
              phone: p.phone
            };
          });
          setExperts(merged);
          setSelectedExpertId(merged[0].id);
        } else {
          setExperts(DEFAULT_EXPERTS);
          setSelectedExpertId(DEFAULT_EXPERTS[0].id);
        }
      } catch (err) {
        console.error("Error loading experts", err);
        setExperts(DEFAULT_EXPERTS);
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
            A curated roster of architects, vetted on built work, available for a single honest session on your project.
          </p>
        </header>

        <div style={{ height: "15vh" }} aria-hidden="true" />

        {/* Expanded Expert Profile - Moved to Top */}
        <section ref={addToRefs} className="w-full flex flex-col items-center">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} The Architects</h2>
          
          {loadingExperts ? (
            <div className="w-full max-w-5xl flex flex-col items-center animate-pulse">
              {/* Carousel Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
                {Array(3).fill(null).map((_, i) => (
                  <div key={i} className="flex flex-col p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] h-32 space-y-4">
                    <div className="h-3 bg-[var(--bg-surface-2)] rounded w-1/3" />
                    <div className="h-6 bg-[var(--bg-surface-2)] rounded w-2/3" />
                    <div className="h-3 bg-[var(--bg-surface-2)] rounded w-1/2" />
                  </div>
                ))}
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
                onSelect={setSelectedExpertId}
              />

              {/* Spacious Active Profile Details Card */}
              {(() => {
                const activeExpert = experts.find((e) => e.id === selectedExpertId) || experts[0];
                if (!activeExpert) return null;
                return (
                  <div key={activeExpert.id} className="w-full flex flex-col gap-16 items-center md:items-start text-left bg-[var(--bg-surface)] border border-[var(--border)] rounded-[40px] p-10 md:p-16 shadow-2xl backdrop-blur-md">
                    
                    <div className="w-full flex flex-col lg:flex-row gap-16 items-center lg:items-start">
                      
                      {/* Cinematic Photo Placeholder */}
                      <div className="w-full max-w-sm lg:w-[350px] h-[480px] bg-[var(--bg-surface-2)] rounded-[32px] border border-[var(--border-strong)] flex-shrink-0 relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] to-transparent opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center font-mono-sos text-[var(--text-faint)] text-[10px] uppercase tracking-widest">
                          Dossier {activeExpert.id.slice(0, 8)}
                        </div>
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

        {/* Investment Architecture — pricing lives on its own, in the open, not
            nested inside any one expert's accordion. Shared across the roster
            since the tiers describe the project, not the consultant. */}
        <section ref={addToRefs} className="w-full flex flex-col items-center">
          <h2 className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)] uppercase mb-12">{"//"} Investment Architecture</h2>

          <div className="w-full max-w-3xl text-left">
            <p className="font-inter text-xs font-light text-[var(--text-muted)] mb-7">
              Select a tier to explore scope and pricing
            </p>

            <div className="grid grid-cols-3 border border-[var(--border-strong)] rounded-[10px] overflow-hidden bg-[var(--bg-surface-2)] mb-5">
              {(Object.keys(PRICING_TIERS) as Array<keyof typeof PRICING_TIERS>).map((tierKey) => {
                const tier = PRICING_TIERS[tierKey];
                const isActive = activeTier === tierKey;
                return (
                  <button
                    key={tierKey}
                    onClick={() => setActiveTier(tierKey)}
                    className={`bg-transparent text-left cursor-pointer relative py-4 px-[18px] border-r border-[var(--border-strong)] last:border-r-0 hover:bg-[var(--bg-surface)] transition-all duration-300 ${
                      isActive ? "bg-[var(--bg-base)]" : ""
                    }`}
                  >
                    <span className="font-mono-sos text-[9px] font-medium tracking-[0.16em] uppercase text-[#b8965a] block mb-1">
                      {tier.num}
                    </span>
                    <span className="font-editorial text-[21px] font-light text-[var(--text-primary)] block leading-[1.1] mb-1.5">
                      {tier.name}
                    </span>
                    <span className="font-inter text-[11px] text-[var(--text-muted)] block">
                      {tier.priceText}
                    </span>
                    <div
                      className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        isActive ? "w-full" : "w-0"
                      } ${tier.inkClass}`}
                    />
                  </button>
                );
              })}
            </div>

            <div
              className="detail-panel rounded-xl overflow-hidden transition-all duration-500"
              style={{ background: PRICING_TIERS[activeTier].gradient }}
            >
              <div
                className="h-[1px] w-full relative overflow-hidden"
                style={{ background: PRICING_TIERS[activeTier].lineGradient }}
              />

              <div key={activeTier} className="p-8 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-8 items-start animate-fade-switch">
                <div className="flex flex-col items-start text-left">
                  <span className={`inline-block text-[9px] font-medium tracking-[0.15em] uppercase px-[9px] py-[3px] rounded-[2px] mb-3.5 ${PRICING_TIERS[activeTier].tagClass}`}>
                    {PRICING_TIERS[activeTier].num} — {PRICING_TIERS[activeTier].name}
                  </span>
                  <h5 className="font-editorial text-[46px] font-light text-white/95 leading-none mb-1 tracking-tight">
                    {PRICING_TIERS[activeTier].name}
                  </h5>
                  <span className="font-mono-sos text-[10px] tracking-[0.15em] uppercase text-white/30 mb-5 min-h-[14px]">
                    {PRICING_TIERS[activeTier].scope}
                  </span>
                  <p className="font-inter text-[13px] font-light text-white/60 leading-[1.7] max-w-[320px]">
                    {PRICING_TIERS[activeTier].desc}
                  </p>
                </div>
                <div className="flex flex-col gap-0 pt-1 text-left">
                  <ul className="list-none mb-6">
                    {PRICING_TIERS[activeTier].feats.map((feat, idx) => (
                      <li key={idx} className="font-inter text-xs font-light text-white/70 py-2 border-b border-white/10 last:border-b-0 flex items-center gap-2.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: PRICING_TIERS[activeTier].color }}
                        />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-white/15">
                    <div className="font-editorial text-[34px] font-normal text-white/95 leading-none tracking-tight">
                      {PRICING_TIERS[activeTier].price}
                    </div>
                    <div className="font-mono-sos text-[10px] tracking-[0.1em] uppercase text-white/30 mt-1 mb-3.5">
                      Base rate / 60 min
                    </div>
                    <button
                      onClick={() => {
                        router.push(`/login?tier=${encodeURIComponent(PRICING_TIERS[activeTier].name)}`);
                      }}
                      className="w-full font-inter text-[11px] font-semibold tracking-wider uppercase py-2.5 px-4 rounded-md border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/40 hover:text-white transition-all duration-300 cursor-pointer text-center"
                    >
                      Book Session ↗
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 w-full text-left">
              <div className="font-mono-sos text-[9px] tracking-[0.16em] uppercase text-[var(--text-muted)] mb-3">
                Available extensions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full">
                <div className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg py-3 px-4 flex items-center justify-between transition-all duration-300 hover:border-[#b8965a] cursor-default">
                  <div>
                    <span className="font-editorial text-[17px] font-normal text-[var(--text-primary)] leading-snug">
                      Advance Booking
                    </span>
                    <p className="font-inter text-[11px] text-[var(--text-muted)] font-light mt-0.5">
                      Requested during initial scheduling
                    </p>
                  </div>
                  <div className="font-mono-sos text-base font-semibold text-[#b8965a]">
                    +40%
                  </div>
                </div>
                <div className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg py-3 px-4 flex items-center justify-between transition-all duration-300 hover:border-[#b8965a] cursor-default">
                  <div>
                    <span className="font-editorial text-[17px] font-normal text-[var(--text-primary)] leading-snug">
                      On-Spot Extension
                    </span>
                    <p className="font-inter text-[11px] text-[var(--text-muted)] font-light mt-0.5">
                      Active session (+30 min)
                    </p>
                  </div>
                  <div className="font-mono-sos text-base font-semibold text-[#b8965a]">
                    +60%
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border)] w-full text-left">
              <div className="font-inter text-xs text-[var(--text-muted)] font-light">
                Written summary delivered within 48 hours of every session.
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
                className="w-full flex flex-col items-center gap-y-12"
                onSubmit={handleInquiry}
              >
                <div className="relative group w-full text-center">
                  <label className="block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] mb-3 uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center">Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
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
                    I acknowledge the <a href="#" className="text-[var(--text-primary)] hover:underline transition-colors">privacy policy</a>.
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
