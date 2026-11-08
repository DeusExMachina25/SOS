"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const EDITORIAL_POSTS = [
  {
    title: "The Art of the Second Opinion",
    date: "May 28, 2026",
    category: "Strategy",
    excerpt:
      "Asking someone to poke holes in your work is not an admission that it's broken. It's how you find out which parts actually hold."
  },
  {
    title: "Reading a Site Before You Draw on It",
    date: "May 15, 2026",
    category: "Site",
    excerpt:
      "Contours, drainage, and where the light actually falls in December. The plot tells you what it wants long before the first sketch does."
  },
  {
    title: "The Rooms People Actually Use",
    date: "April 30, 2026",
    category: "Interiors",
    excerpt:
      "Every plan has a room that looks generous on paper and sits empty for a decade. Here's how to catch it while it's still a line."
  }
];

/** U7: Editorial, three article cards. The articles are placeholders for now. */
export default function Editorial() {
  const editorialCardsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
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
    });
    return () => ctx.revert();
  }, []);

  return (
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
  );
}
