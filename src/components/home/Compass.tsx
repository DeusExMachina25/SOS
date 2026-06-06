"use client";

import React, { useEffect, useRef } from "react";

interface CompassProps {
  tilted?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function Compass({ tilted = false, style, className = "" }: CompassProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mouseX: number | null = null;
    let mouseY: number | null = null;
    let currentRotation = 0;
    let targetRotation = 0;
    let isSpinning = false;
    let spinTimeout: NodeJS.Timeout;
    let lastScrollY = window.scrollY;
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleScroll = () => {
      isSpinning = true;
      clearTimeout(spinTimeout);
      spinTimeout = setTimeout(() => {
        isSpinning = false;
      }, 150);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    const animate = () => {
      if (isSpinning) {
        const scrollDelta = window.scrollY - lastScrollY;
        targetRotation += scrollDelta * 2;
        currentRotation += (targetRotation - currentRotation) * 0.2;
      } else {
        if (mouseX === null || mouseY === null) {
          targetRotation = 0;
        } else {
          if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let angle = Math.atan2(mouseY - cy, mouseX - cx) * (180 / Math.PI) + 90;
            let diff = angle - (currentRotation % 360);
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            targetRotation = currentRotation + diff;
          }
        }
        currentRotation += (targetRotation - currentRotation) * 0.08;
      }

      lastScrollY = window.scrollY;

      if (dialRef.current) {
        dialRef.current.style.transform = `rotateZ(${currentRotation}deg)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
      clearTimeout(spinTimeout);
    };
  }, []);

  return (
    <div 
      className={`relative w-[280px] h-[280px] perspective-[1200px] z-10 ${className}`}
      style={style}
    >
      <div 
        ref={wrapperRef}
        className={`w-full h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center justify-center transform-style-3d bg-[var(--bg-surface-2)] border border-[var(--border)]
          ${tilted ? 'rotate-x-[60deg] scale-110 shadow-xl' : 'shadow-md'}
        `}
        style={{
          transformStyle: "preserve-3d",
          backgroundImage: "radial-gradient(var(--dot-color) 20%, transparent 21%), radial-gradient(var(--dot-color) 20%, transparent 21%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 8px 8px"
        }}
      >
        <div 
          className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-1000"
          style={{
            transformStyle: "preserve-3d",
            transform: tilted ? "translateZ(12px)" : "translateZ(0px)"
          }}
        >
          <div 
            ref={dialRef}
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ transformStyle: "preserve-3d" }}
          >
            {['N', 'E', 'S', 'W'].map((mark, i) => (
              <span 
                key={mark}
                className="absolute font-display font-bold text-2xl text-[var(--text-faint)] transition-transform duration-1000"
                style={{
                  top: mark === 'N' ? '15px' : 'auto',
                  right: mark === 'E' ? '15px' : 'auto',
                  bottom: mark === 'S' ? '15px' : 'auto',
                  left: mark === 'W' ? '15px' : 'auto',
                  transform: tilted ? "translateZ(15px)" : "translateZ(0px)"
                }}
              >
                {mark}
              </span>
            ))}
            
            {/* Minimal Needle */}
            <div 
              className="relative w-0 h-0 transition-all duration-1000"
              style={{
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderBottom: "100px solid var(--color-pink)",
                transformOrigin: "bottom center",
                bottom: "50px",
                transformStyle: "preserve-3d",
                transform: tilted ? "translateZ(35px)" : "translateZ(0px)",
                filter: tilted ? "drop-shadow(0px 15px 10px rgba(0,0,0,0.2))" : "drop-shadow(0px 4px 4px rgba(0,0,0,0.1))"
              }}
            >
              <div 
                className="absolute"
                style={{
                  top: "100px",
                  left: "-8px",
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: "100px solid var(--color-secondary)"
                }}
              />
            </div>
          </div>

          {/* Pivot */}
          <div 
            className="absolute w-4 h-4 rounded-full bg-[var(--color-gold)] transition-transform duration-1000"
            style={{
              top: "50%",
              left: "50%",
              margin: "-8px 0 0 -8px",
              transformStyle: "preserve-3d",
              transform: tilted ? "translateZ(40px)" : "translateZ(0px)",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
            }}
          />
        </div>
      </div>
    </div>
  );
}
