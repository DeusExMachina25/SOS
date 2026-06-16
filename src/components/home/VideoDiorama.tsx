"use client";

import React, { useEffect, useRef } from "react";

interface VideoDioramaProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function VideoDiorama({ style, className = "" }: VideoDioramaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;
    let isReversing = false;
    let lastTime = performance.now();

    const checkTime = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1); // cap delta to avoid big jumps
      lastTime = now;

      if (isReversing) {
        video.currentTime = Math.max(0, video.currentTime - delta);
        if (video.currentTime <= 0.01) {
          isReversing = false;
          video.play().catch(() => {});
        }
      } else {
        if (video.currentTime >= 0.3) {
          isReversing = true;
          video.pause();
        }
      }
      animationFrameId = requestAnimationFrame(checkTime);
    };

    animationFrameId = requestAnimationFrame(checkTime);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      className={`relative flex items-center justify-center pointer-events-none ${className}`}
      style={{
        perspective: "1200px",
        ...style
      }}
    >
      {/* 3D Container without the glass frame */}
      <div 
        className="relative w-[600px] aspect-video overflow-hidden"
        style={{
          transform: "rotateY(-15deg) rotateX(10deg) scale(0.95)",
          transformStyle: "preserve-3d",
          transition: "transform 0.4s ease-out"
        }}
      >
        {/* Video Element with native alpha transparency */}
        <video 
          ref={videoRef}
          src="/diorama transpavid.webm"
          autoPlay 
          muted 
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
