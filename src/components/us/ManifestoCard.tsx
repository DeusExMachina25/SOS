"use client";

import React, { useRef, useState } from "react";

interface ManifestoCardProps {
  title: string;
  description: string;
  index: number;
}

export default function ManifestoCard({ title, description, index }: ManifestoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation (-10 to 10 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    
    // Dynamic glow effect following cursor
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!cardRef.current) return;
    cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  return (
    <div 
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative p-8 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] backdrop-blur-xl transition-all duration-300 ease-out overflow-hidden group manifesto-card`}
      style={{
        transition: isHovered ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
    >
      {/* Dynamic Cursor Glow */}
      <div 
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.06), transparent 40%)`
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="text-[var(--color-primary)] font-mono-sos text-xs mb-6 opacity-60">0{index + 1}{" // PILLAR"}</div>
        <h3 className="font-display text-3xl font-bold mb-4 text-[var(--text-primary)]">{title}</h3>
        <p className="font-inter text-[var(--text-muted)] leading-relaxed flex-grow">
          {description}
        </p>
      </div>
    </div>
  );
}
