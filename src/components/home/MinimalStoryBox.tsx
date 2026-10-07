"use client";

import React from "react";

interface MinimalStoryBoxProps {
  title?: string;
  paragraphs: string[];
  remark?: string;
  className?: string;
}

export default function MinimalStoryBox({ 
  title, 
  paragraphs, 
  remark, 
  className = ""
}: MinimalStoryBoxProps) {
  return (
    <div className={`max-w-2xl px-6 xl:px-12 flex flex-col justify-center ${className}`}>
      {title && (
        <h3 className="font-display text-3xl md:text-4xl xl:text-6xl text-[var(--text-primary)] mb-4 xl:mb-8 tracking-tighter leading-tight drop-shadow-2xl">
          {title}
        </h3>
      )}
      
      <div className="space-y-4 xl:space-y-6">
        {paragraphs.map((p, i) => (
          <p 
            key={i} 
            className="font-sans text-base md:text-lg xl:text-2xl text-[var(--text-muted)] font-light leading-relaxed"
          >
            {p}
          </p>
        ))}
      </div>

      {remark && (
        <div className="mt-12 pt-6 border-t border-[var(--border-strong)]">
          <span className="font-mono-sos text-xs tracking-[0.2em] text-[var(--color-primary)]">
            {remark}
          </span>
        </div>
      )}
    </div>
  );
}
