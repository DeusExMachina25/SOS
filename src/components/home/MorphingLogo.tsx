"use client";

import { useEffect, useState } from "react";

const FONTS = [
  "'Abril Fatface', serif", "'Alfa Slab One', serif",
  "'Anton', sans-serif", "'Bebas Neue', sans-serif", 
  "'Merriweather', serif", "'Montserrat', sans-serif",
  "'Oswald', sans-serif", "'Playfair Display', serif", 
  "'Righteous', cursive", "'Special Elite', cursive",
  "'Courier Prime', monospace", "'Bungee', cursive", 
  "'Shrikhand', cursive", "'VT323', monospace", 
  "'Creepster', cursive", "'Rampart One', cursive",
  "'Monoton', cursive", "'Cinzel', serif",
  "'Syne', sans-serif", "'Space Mono', monospace",
  "'Unbounded', sans-serif", "'Bodoni Moda', serif",
  "'Syncopate', sans-serif", "'Megrim', cursive",
  "'Silkscreen', cursive", "'Ewert', cursive",
  "'Bungee Hairline', cursive", "'Teko', sans-serif",
  "'Archivo Black', sans-serif", "'Kanit', sans-serif",
  "'Titan One', cursive", "'Staatliches', cursive",
  "'Russo One', sans-serif", "'Bangers', cursive"
];

const COLORS = [
  "var(--color-primary)", "var(--color-gold)", "var(--color-teal)",
  "var(--color-coral)", "var(--color-cyan)", "var(--color-pink)", "#FFFFFF",
  "#FF3366", "#33FFCC", "#FFCC00", "#9933FF", "#00E5FF", 
  "#FF3399", "#39FF14", "#FF00FF", "#00FF00", "#FFFF00", 
  "#FF4500", "#8A2BE2", "#00BFFF", "#FF1493"
];

interface MorphingLogoProps {
  variant?: "main" | "embossed" | "exploded";
  text?: string;
}

export default function MorphingLogo({ variant = "main", text = "SOS" }: MorphingLogoProps) {
  const chars = text.split('');

  const [fontStyles, setFontStyles] = useState<{ [key: string]: { fontFamily: string; transform: string; color: string } }>(() => {
    const initial: Record<number, { fontFamily: string; transform: string; color: string }> = {};
    chars.forEach((_, i) => {
      const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)];
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      const yOffset = (Math.random() - 0.5) * 10;
      initial[i] = { 
        fontFamily: randomFont, 
        transform: `translateY(${yOffset}px)`, 
        color: (variant === "embossed" || variant === "exploded") ? "transparent" : randomColor 
      };
    });
    return initial;
  });

  useEffect(() => {
    if (variant === "exploded" || variant === "embossed") {
      return;
    }

    const interval = setInterval(() => {
      setFontStyles(prev => {
        const newStyles = { ...prev };
        for (let i = 0; i < chars.length; i++) { 
          const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)];
          const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
          const yOffset = (Math.random() - 0.5) * 10;
          newStyles[i] = {
            fontFamily: randomFont,
            transform: `translateY(${yOffset}px)`,
            color: randomColor
          };
        }
        return newStyles;
      });
    }, 338); // Slower, more readable morphing speed

    return () => clearInterval(interval);
  }, [variant, chars.length]);

  const textClass = 
    variant === "exploded" ? "exploded-text" :
    variant === "embossed" ? "text-embossed" : "text-white";

  return (
    <div className={`flex items-center justify-center select-none whitespace-nowrap ${textClass}`}>
      {chars.map((char, i) => (
        <span 
          key={i}
          className="inline-block transition-all duration-[338ms] mx-1"
          style={fontStyles[i] || {}}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
