"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Reveal from "../shared/Reveal";
import BlockFrame from "../shared/BlockFrame";
import { useExperts } from "../experts/useExperts";

/**
 * P4: the picked expert's profile card: portrait (or initials), bio, tags,
 * "Areas of Influence" drop-down and the Secure slot button. Follows the
 * slice picked in the field pie (P3).
 */
export default function ExpertProfile() {
  const router = useRouter();
  const { loading, active } = useExperts();
  // Which expert's drop-down is open; picking another expert closes it
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = !!active && openFor === active.id;

  return (
    <BlockFrame>
      <Reveal className="w-full max-w-5xl flex flex-col items-center">
        {loading || !active ? (
          <div className="w-full flex flex-col md:flex-row gap-12 items-center md:items-start text-left bg-[var(--bg-surface)] border border-[var(--border)] rounded-[40px] p-10 md:p-16 shadow-2xl backdrop-blur-md animate-pulse">
            <div className="w-64 h-[420px] bg-[var(--bg-surface-2)] rounded-3xl border border-[var(--border)] flex-shrink-0" />
            <div className="flex flex-col flex-1 w-full space-y-6">
              <div className="h-16 bg-[var(--bg-surface-2)] rounded-xl w-3/4" />
              <div className="h-4 bg-[var(--bg-surface-2)] rounded-lg w-1/4" />
              <div className="space-y-3 w-full">
                <div className="h-4 bg-[var(--bg-surface-2)] rounded-lg w-full" />
                <div className="h-4 bg-[var(--bg-surface-2)] rounded-lg w-5/6" />
              </div>
            </div>
          </div>
        ) : (
          <div key={active.id} id="expert-profile" className="w-full scroll-mt-28 flex flex-col gap-16 items-center md:items-start text-left bg-[var(--bg-surface)] border border-[var(--border)] rounded-[40px] p-10 md:p-16 shadow-2xl backdrop-blur-md">

            <div className="w-full flex flex-col lg:flex-row gap-16 items-center lg:items-start">

              {/* Portrait: the real photo when one is on file, otherwise a monogram. */}
              <div className="w-full max-w-sm lg:w-[350px] h-[480px] bg-[var(--bg-surface-2)] rounded-[32px] border border-[var(--border-strong)] flex-shrink-0 relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 shadow-lg">
                <div
                  role="img"
                  aria-label={`${active.full_name}, ${active.expert_role ?? "expert"}`}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                >
                  <span className="font-editorial text-[9rem] leading-none text-[var(--text-primary)] opacity-80 select-none">
                    {active.full_name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join("")}
                  </span>
                  <span className="font-mono-sos text-xs uppercase tracking-[0.25em] text-[var(--text-muted)] px-6 text-center">
                    {active.expert_role}
                  </span>
                </div>
                {active.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={active.avatar_url}
                    src={active.avatar_url}
                    alt={`Portrait of ${active.full_name}`}
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
                  {active.full_name}
                </h3>
                <div className="font-mono-sos text-sm text-[var(--color-primary)] mb-8 tracking-[0.25em] uppercase font-semibold">
                  {active.expert_role}
                </div>
                <p className="font-inter text-[var(--text-muted)] text-xl leading-relaxed mb-8 max-w-3xl font-light">
                  {active.bio}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-3 mb-10">
                  {active.tags?.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-mono-sos border border-[var(--border)] px-4 py-2 text-[var(--text-muted)] rounded-full bg-[var(--bg-base)]/40 tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    localStorage.setItem("platter_selected_expert", active.id);
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
                  onClick={() => setOpenFor(open ? null : active.id)}
                  className={`w-full py-8 flex items-center justify-between text-left group cursor-pointer focus:outline-none border-b transition-all duration-300 ${
                    open 
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
                      open ? "bg-[var(--color-green)]" : "bg-[var(--text-muted)] group-hover:bg-[var(--text-primary)]"
                    }`}></div>
                    <div className={`absolute h-4 w-[1px] transition-all duration-500 ${
                      open ? "bg-[var(--color-green)] rotate-90 opacity-0" : "bg-[var(--text-muted)] group-hover:bg-[var(--text-primary)] rotate-0"
                    }`}></div>
                  </div>
                </button>

                {/* Collapsible Content */}
                <div className={`grid transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="md:pl-16 pb-12 pt-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {active.disciplines?.map((service, i) => {
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
        )}
      </Reveal>
    </BlockFrame>
  );
}
