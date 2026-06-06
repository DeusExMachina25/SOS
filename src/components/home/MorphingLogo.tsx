"use client";

import { useEffect, useState } from "react";

const FONTS = [
  "'Abril Fatface', serif", "'Alfa Slab One', serif", "'Amatic SC', cursive",
  "'Anton', sans-serif", "'Bebas Neue', sans-serif", "'Dancing Script', cursive",
  "'Lobster', cursive", "'Merriweather', serif", "'Montserrat', sans-serif",
  "'Oswald', sans-serif", "'Pacifico', cursive", "'Permanent Marker', cursive",
  "'Playfair Display', serif", "'Righteous', cursive", "'Special Elite', cursive",
  "'Courier Prime', monospace"
];

const COLORS = [
  "var(--color-primary)", "var(--color-gold)", "var(--color-teal)",
  "var(--color-coral)", "var(--color-cyan)", "var(--color-pink)", "#FFFFFF"
];

export default function MorphingLogo() {
  const [fontStyles, setFontStyles] = useState<{ [key: string]: { fontFamily: string; transform: string; color: string } }>({
    0: { fontFamily: FONTS[0], transform: "translateY(0px)", color: COLORS[6] },
    1: { fontFamily: FONTS[0], transform: "translateY(0px)", color: COLORS[6] },
    2: { fontFamily: FONTS[0], transform: "translateY(0px)", color: COLORS[6] }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setFontStyles(prev => {
        const newStyles = { ...prev };
        for (let i = 0; i < 3; i++) { // Only S, O, S (3 characters)
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
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center select-none text-white whitespace-nowrap">
      {['S', 'O', 'S'].map((char, i) => (
        <span 
          key={i}
          className="inline-block transition-all duration-300 mx-1"
          style={fontStyles[i]}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
