"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { subscribePointer } from "@/lib/motion/pointer";

/** U1: giant "US" over a photo that drifts with the mouse (phone tilt on mobile). */
export default function UsHero() {
  const textRef = useRef<HTMLHeadingElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const xTo = gsap.quickTo(imageRef.current, "x", { duration: 0.8, ease: "power3.out" });
      const yTo = gsap.quickTo(imageRef.current, "y", { duration: 0.8, ease: "power3.out" });
      const unsubscribe = subscribePointer(({ x, y }) => {
        xTo((x / window.innerWidth - 0.5) * 50);
        yTo((y / window.innerHeight - 0.5) * 50);
      });
      gsap.fromTo(textRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 2, ease: "power3.out", delay: 0.3 });
      return unsubscribe;
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[var(--bg-base)]">
        <Image
          ref={imageRef}
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
          ref={textRef}
          className="font-editorial text-[6rem] md:text-[10rem] lg:text-[14rem] font-normal tracking-tight uppercase text-[var(--text-primary)] leading-none"
        >
          US
        </h1>
        <p className="mt-12 font-mono-sos text-[10px] md:text-xs tracking-[0.4em] text-[var(--text-muted)] uppercase">
          The Anatomy of a Second Opinion
        </p>
      </div>
    </section>
  );
}
