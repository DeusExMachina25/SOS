"use client";

import React from "react";

interface FigmaComponentProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function FigmaComponent({ style, className = "" }: FigmaComponentProps) {
  return (
    <div 
      className={`w-[340px] bg-[#3B2544] p-6 border-2 border-dashed border-[rgba(255,255,255,0.2)] font-sans ${className}`}
      style={{
        borderRadius: "20px 35px 25px 30px / 30px 25px 35px 20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        ...style
      }}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="bg-[rgba(255,255,255,0.1)] px-3 py-1.5 text-xs font-semibold tracking-wide border border-[rgba(255,255,255,0.15)] rounded-full text-[var(--color-secondary)]">
          Live Draft
        </div>
        <div className="flex">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ccff] to-[var(--color-primary)] border-2 border-[#3B2544] z-10"></div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffcc00] to-[var(--color-pink)] border-2 border-[#3B2544] -ml-2 z-0"></div>
        </div>
      </div>
      
      <div>
        <h4 className="m-0 mb-2 font-script text-2xl font-bold text-[var(--color-gold)]">
          Component Sync
        </h4>
        <p className="m-0 mb-6 text-sm text-[rgba(255,255,255,0.7)] leading-relaxed font-display">
          Deploying coordinates into the dynamic grid system. Real-time organic rendering active.
        </p>
        
        <div className="flex justify-between text-xs font-semibold mb-2 text-[rgba(255,255,255,0.6)]">
          <span>Calibration</span>
          <span>78%</span>
        </div>
        <div className="w-full h-2 bg-[rgba(0,0,0,0.3)] rounded-full mb-6 overflow-hidden">
          <div className="h-full w-[78%] bg-[var(--color-cyan)] rounded-full relative"></div>
        </div>
      </div>
      
      <button className="w-full p-3.5 bg-white text-[#3B2544] font-bold text-[13px] tracking-wider uppercase rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all border-none cursor-pointer">
        Initialize Blueprint
      </button>
    </div>
  );
}
