"use client";

import React, { useEffect, useRef } from "react";

interface CompassProps {
  tiltMode?: '2d' | '2.5d' | '3d';
  style?: React.CSSProperties;
  className?: string;
}

export default function Compass({ tiltMode = '2d', style, className = "" }: CompassProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const angle = Math.atan2(mouseY - cy, mouseX - cx) * (180 / Math.PI) + 90;
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
      ref={containerRef}
      className={`relative w-[280px] h-[280px] perspective-[1200px] z-10 ${className}`}
      style={style}
    >
      <div 
        ref={wrapperRef}
        className={`w-full h-full rounded-full flex items-center justify-center transform-style-3d bg-[var(--bg-surface-2)] border border-[var(--border)]
          ${tiltMode === '3d' ? 'shadow-2xl' : tiltMode === '2.5d' ? 'shadow-xl' : 'shadow-md'}
        `}
        style={{
          transformStyle: "preserve-3d",
          backgroundImage: "radial-gradient(var(--dot-color) 20%, transparent 21%), radial-gradient(var(--dot-color) 20%, transparent 21%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 8px 8px",
          transform: tiltMode === '3d' ? 'rotateX(60deg) rotateY(0deg) scale(1.1)' : 
                     tiltMode === '2.5d' ? 'rotateX(35deg) rotateY(-15deg) scale(1.05)' : 
                     'rotateX(0deg) rotateY(0deg) scale(1)',
          transition: "transform 1500ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 1500ms ease"
        }}
      >
        <div 
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            transformStyle: "preserve-3d",
            transform: tiltMode === '3d' ? "translateZ(15px)" : tiltMode === '2.5d' ? "translateZ(8px)" : "translateZ(0px)",
            transition: "transform 1500ms cubic-bezier(0.25, 1, 0.5, 1)"
          }}
        >
          <div 
            ref={dialRef}
            className="absolute inset-0 rounded-full"
            style={{ transformStyle: "preserve-3d" }}
          >
            {['N', 'E', 'S', 'W'].map((mark) => {
              const markStyle: React.CSSProperties = {
                position: 'absolute',
                transformStyle: 'preserve-3d',
                transition: 'transform 1500ms cubic-bezier(0.25, 1, 0.5, 1)',
              };
              
              const z = tiltMode === '3d' ? "20px" : tiltMode === '2.5d' ? "12px" : "0px";
              
              if (mark === 'N') {
                markStyle.top = '15px';
                markStyle.left = '50%';
                markStyle.transform = `translateX(-50%) translateZ(${z})`;
              } else if (mark === 'S') {
                markStyle.bottom = '15px';
                markStyle.left = '50%';
                markStyle.transform = `translateX(-50%) translateZ(${z})`;
              } else if (mark === 'E') {
                markStyle.right = '15px';
                markStyle.top = '50%';
                markStyle.transform = `translateY(-50%) translateZ(${z})`;
              } else if (mark === 'W') {
                markStyle.left = '15px';
                markStyle.top = '50%';
                markStyle.transform = `translateY(-50%) translateZ(${z})`;
              }

              return (
                <span 
                  key={mark}
                  className="font-display font-bold text-2xl text-[var(--text-faint)]"
                  style={markStyle}
                >
                  {mark}
                </span>
              );
            })}
            
            {/* Minimal Needle */}
            <div 
              className="absolute"
              style={{
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderBottom: "100px solid var(--color-pink)",
                transformOrigin: "bottom center",
                left: "calc(50% - 8px)",
                bottom: "50%",
                transformStyle: "preserve-3d",
                transform: tiltMode === '3d' ? "translateZ(45px)" : tiltMode === '2.5d' ? "translateZ(30px)" : "translateZ(0px)",
                filter: tiltMode !== '2d' ? "drop-shadow(0px 15px 10px rgba(0,0,0,0.2))" : "drop-shadow(0px 4px 4px rgba(0,0,0,0.1))",
                transition: "transform 1500ms cubic-bezier(0.25, 1, 0.5, 1), filter 1500ms ease"
              }}
            >
              <div 
                className="absolute"
                style={{
                  top: "100px",
                  left: "-8px",
                  width: 0,
                  height: 0,
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: "100px solid var(--color-secondary)"
                }}
              />
            </div>
          </div>

          {/* Pivot */}
          <div 
            className="absolute w-4 h-4 rounded-full bg-[var(--color-gold)]"
            style={{
              top: "50%",
              left: "50%",
              margin: "-8px 0 0 -8px",
              transformStyle: "preserve-3d",
              transform: tiltMode === '3d' ? "translateZ(50px)" : tiltMode === '2.5d' ? "translateZ(35px)" : "translateZ(0px)",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              transition: "transform 1500ms cubic-bezier(0.25, 1, 0.5, 1)"
            }}
          />
        </div>
      </div>
    </div>
  );
}
