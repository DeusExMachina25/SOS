"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const BOX_COLORS = [
  "bg-[var(--color-primary)]",
  "bg-[var(--color-cyan)]",
  "bg-[#ff4081]",
  "bg-[var(--text-primary)]",
  "bg-[#ffff00]",
];

export default function ParallaxBoxes() {
  // Refs for targeting the boxes
  const box1Ref = useRef<HTMLDivElement>(null);
  const box2Ref = useRef<HTMLDivElement>(null);

  // Box Color State
  const [boxColor, setBoxColor] = useState<string>(BOX_COLORS[0]);

  useEffect(() => {
    // 1. Color Cycling Interval
    const interval = setInterval(() => {
      setBoxColor(BOX_COLORS[Math.floor(Math.random() * BOX_COLORS.length)]);
    }, 800);

    // 2. Mouse Parallax Setup (Opposing directions)
    // Box 1 moves a bit slower and stiffer
    const box1XTo = gsap.quickTo(box1Ref.current, "x", { duration: 0.6, ease: "power2.out" });
    const box1YTo = gsap.quickTo(box1Ref.current, "y", { duration: 0.6, ease: "power2.out" });
    
    // Box 2 moves faster and looser
    const box2XTo = gsap.quickTo(box2Ref.current, "x", { duration: 0.9, ease: "power2.out" });
    const box2YTo = gsap.quickTo(box2Ref.current, "y", { duration: 0.9, ease: "power2.out" });

    // 3. Mouse Tracking Event
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates to a center origin (-0.5 to 0.5)
      const centerX = e.clientX / window.innerWidth - 0.5;
      const centerY = e.clientY / window.innerHeight - 0.5;
      
      // Shift box 1 backwards (opposite of mouse)
      box1XTo(centerX * -30); 
      box1YTo(centerY * -30);
      
      // Shift box 2 forwards (with the mouse)
      box2XTo(centerX * 40); 
      box2YTo(centerY * 40);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full py-16">
      {/* The Animated Box Elements */}
      <div className="relative w-24 h-24 z-10 flex items-center justify-center hover:scale-110 transition-transform duration-700">
        
        {/* Bottom-left box (Static, bordered outline) */}
        <div 
          ref={box1Ref} 
          className="absolute top-4 left-0 w-16 h-16 bg-[var(--bg-base)] border-2 border-[var(--text-muted)] rounded-none shadow-2xl"
        ></div>
        
        {/* Top-right box (Glass effect, color-cycling) */}
        <div 
          ref={box2Ref} 
          className={`absolute top-0 right-0 w-16 h-16 ${boxColor} rounded-none opacity-60 backdrop-blur-md border border-white/20 shadow-2xl animate-pulse transition-colors duration-500`}
        ></div>

      </div>

    </div>
  );
}
