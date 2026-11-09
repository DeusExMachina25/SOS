"use client";

import React, { useEffect, useState } from "react";
import Reveal from "../shared/Reveal";

const ANGLE_FONTS = ["font-futuristic", "font-editorial", "font-display", "font-inter", "font-mono-sos"];

const ANGLE_COLORS = [
  "text-[var(--color-primary)]",
  "text-[var(--color-orange)]",
  "text-[var(--color-green)]",
  "text-[var(--text-primary)]",
  "text-[var(--color-secondary)]",
];

/** P1: "Approaching projects from a different ANGLE", with the spinning tile and four circles. */
export default function AngleHero() {
  const [letterStyles, setLetterStyles] = useState<{ font: string; color: string }[]>(
    Array(5).fill({ font: ANGLE_FONTS[0], color: ANGLE_COLORS[0] })
  );

  // Each letter of ANGLE swaps font and colour every 0.8s
  useEffect(() => {
    const interval = setInterval(() => {
      setLetterStyles(
        Array(5)
          .fill(null)
          .map(() => ({
            font: ANGLE_FONTS[Math.floor(Math.random() * ANGLE_FONTS.length)],
            color: ANGLE_COLORS[Math.floor(Math.random() * ANGLE_COLORS.length)],
          }))
      );
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <Reveal className="relative w-full overflow-hidden border-b border-[var(--border)] py-[15vh] md:py-[20vh] px-4 flex flex-col items-center justify-center">
      <div className="absolute top-[10%] left-[5%] md:left-[15%] opacity-30 pointer-events-none w-48 h-48 bg-[var(--bg-surface-2)] rounded-sm transform rotate-12 backdrop-blur-3xl border border-[var(--border-strong)] animate-[spin_60s_linear_infinite]"></div>
      <div className="absolute bottom-[20%] right-[5%] md:right-[15%] opacity-20 pointer-events-none w-64 h-32 bg-[var(--bg-surface)] rounded-sm transform -rotate-6 backdrop-blur-3xl border border-[var(--border)] animate-[pulse_10s_ease-in-out_infinite]"></div>

      <div className="relative w-24 h-24 mt-[10vh] z-10 flex items-center justify-center hover:rotate-90 hover:scale-110 transition-all duration-700 cursor-default">
        <div className="absolute top-0 left-0 w-16 h-16 bg-transparent border border-[var(--text-muted)] rounded-full"></div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-transparent border border-[var(--text-primary)] rounded-full animate-[pulse_4s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-transparent border border-[var(--text-primary)] rounded-full animate-[pulse_4s_ease-in-out_infinite_2s]"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 bg-transparent border border-[var(--text-muted)] rounded-full"></div>
      </div>

      <div className="text-center z-10 flex flex-col items-center max-w-6xl mx-auto mt-[80vh] mb-[20vh]">
        <div className="font-editorial text-[7vw] md:text-7xl leading-[1.1] text-[var(--text-primary)] tracking-tight drop-shadow-2xl">
          APPROACHING PROJECTS FROM
        </div>
        <div className="font-editorial text-[7vw] md:text-7xl leading-[1.1] text-[var(--text-primary)] tracking-tight drop-shadow-2xl flex flex-wrap items-center justify-center gap-4 mt-6">
          A DIFFERENT
          <span className="font-bold inline-flex transform rotate-[-4deg] scale-x-[-1] origin-center -translate-y-2 drop-shadow-[0_0_15px_rgba(179,136,255,0.5)] animate-[pulse_3s_ease-in-out_infinite] hover:scale-110 hover:rotate-[4deg] transition-all duration-500 cursor-default">
            {"ANGLE".split("").map((letter, i) => (
              <span key={i} className={`${letterStyles[i]?.font} ${letterStyles[i]?.color} transition-all duration-300`}>
                {letter}
              </span>
            ))}
          </span>
        </div>
      </div>
    </Reveal>
  );
}
