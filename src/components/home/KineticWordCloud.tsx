"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const WORDS = [
  "Strategy", "Scale", "Pivot", "Innovation", "Execution", 
  "Design", "Architecture", "Consulting", "Velocity", "Vision",
  "Blueprint", "Calibration"
];

interface KineticWordCloudProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function KineticWordCloud({ style, className = "" }: KineticWordCloudProps) {
  
  return (
    <div 
      className={`relative w-[400px] h-[400px] flex items-center justify-center overflow-hidden ${className}`}
      style={style}
    >
      {WORDS.map((word, i) => {
        // Pseudo-random deterministic values for initial placement
        const randomX = Math.sin(i * 123) * 150;
        const randomY = Math.cos(i * 321) * 150;
        const randomScale = 0.5 + Math.abs(Math.sin(i * 456)) * 1.5;
        const randomDuration = 10 + Math.abs(Math.cos(i * 789)) * 20;
        const color = i % 3 === 0 ? "var(--color-primary)" : 
                      i % 3 === 1 ? "var(--color-gold)" : 
                      "var(--text-muted)";

        return (
          <motion.div
            key={i}
            className="absolute font-display italic font-bold whitespace-nowrap opacity-60 mix-blend-screen"
            style={{ 
              color, 
              fontSize: `${randomScale * 2}rem`,
              zIndex: Math.floor(randomScale * 10)
            }}
            initial={{ x: randomX, y: randomY, opacity: 0 }}
            animate={{ 
              x: [randomX, randomX + (Math.sin(i) * 50), randomX],
              y: [randomY, randomY + (Math.cos(i) * 50), randomY],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {word}
          </motion.div>
        );
      })}
      
      {/* Center Anchor Word */}
      <div className="absolute z-50 font-display italic font-bold text-5xl text-white drop-shadow-md">
        Clarity
      </div>
    </div>
  );
}
