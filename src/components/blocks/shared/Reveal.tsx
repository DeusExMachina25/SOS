"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "header" | "div";
  children: React.ReactNode;
}

/**
 * Fades and lifts its content in as it scrolls into view, and back out when
 * you scroll up past it. Each block cleans up only its own animation, so
 * blocks can sit on any page without disturbing each other.
 */
export default function Reveal({ as = "section", children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 100 },
        {
          opacity: 1,
          y: 0,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 80%", toggleActions: "play none none reverse" },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  const Tag = as as React.ElementType;
  return <Tag ref={ref} {...rest}>{children}</Tag>;
}
