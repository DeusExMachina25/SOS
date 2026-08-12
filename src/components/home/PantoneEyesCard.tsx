"use client";

import React, { useEffect, useRef } from "react";

export default function PantoneEyesCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const pupilLeftRef = useRef<HTMLDivElement>(null);
  const pupilRightRef = useRef<HTMLDivElement>(null);
  
  // Use refs for animation state to avoid re-renders
  const state = useRef({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      state.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        state.current.targetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        state.current.targetY = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    let animationFrameId: number;

    const animate = () => {
      const s = state.current;
      // Lerp for smooth movement
      s.currentX += (s.targetX - s.currentX) * 0.1;
      s.currentY += (s.targetY - s.currentY) * 0.1;

      const card = cardRef.current;
      const glare = glareRef.current;
      const pupils = [pupilLeftRef.current, pupilRightRef.current];

      if (card) {
        const maxTiltX = 15;
        const maxTiltY = 15;
        const rotateX = s.currentY * -maxTiltX;
        const rotateY = s.currentX * maxTiltY;
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }

      if (glare) {
        const glareX = (s.currentX + 1) * 50;
        const glareY = (s.currentY + 1) * 50;
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 60%)`;
      }

      const maxPupilTravel = 16;
      pupils.forEach(pupil => {
        if (!pupil || !pupil.parentElement) return;

        const eyeRect = pupil.parentElement.getBoundingClientRect();
        const eyeCenterX = eyeRect.left + eyeRect.width / 2;
        const eyeCenterY = eyeRect.top + eyeRect.height / 2;

        const currentRawMouseX = ((s.currentX + 1) / 2) * window.innerWidth;
        const currentRawMouseY = ((s.currentY + 1) / 2) * window.innerHeight;
        
        const lerpedAngle = Math.atan2(currentRawMouseY - eyeCenterY, currentRawMouseX - eyeCenterX);
        const lerpedDist = Math.hypot(currentRawMouseX - eyeCenterX, currentRawMouseY - eyeCenterY);
        const finalTravel = Math.min(maxPupilTravel, (lerpedDist / 200) * maxPupilTravel);

        const tx = Math.cos(lerpedAngle) * finalTravel;
        const ty = Math.sin(lerpedAngle) * finalTravel;

        pupil.style.transform = `translate(${tx}px, ${ty}px)`;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .pantone-component {
            --tcx-purple: #5F4B8B;
            --card-width: 320px;
            --card-height: 440px;
            font-family: 'Inter', sans-serif;
            perspective: 1200px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .pantone-scene {
            width: var(--card-width);
            height: var(--card-height);
            position: relative;
        }

        .pantone-card {
            width: 100%;
            height: 100%;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.1),
                0 1px 3px rgba(0, 0, 0, 0.05),
                inset 0 0 0 1px rgba(255, 255, 255, 0.5);
            transform-style: preserve-3d;
            position: relative;
            overflow: hidden;
            will-change: transform;
        }

        .pantone-glare {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(
                circle at 50% 50%, 
                rgba(255, 255, 255, 0.4) 0%, 
                rgba(255, 255, 255, 0) 60%
            );
            pointer-events: none;
            z-index: 10;
            mix-blend-mode: overlay;
            opacity: 0.6;
            will-change: background;
        }

        .pantone-card-color {
            width: 100%;
            height: 75%;
            background-color: var(--tcx-purple);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            position: relative;
        }

        .pantone-eye {
            width: 80px;
            height: 80px;
            background: #ffffff;
            border-radius: 50%;
            position: relative;
            box-shadow: 
                inset 0 8px 15px rgba(0, 0, 0, 0.1),
                0 4px 10px rgba(0, 0, 0, 0.15);
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .pantone-pupil {
            width: 36px;
            height: 36px;
            background: #111111;
            border-radius: 50%;
            position: absolute;
            box-shadow: inset 0 -4px 6px rgba(0, 0, 0, 0.5);
            will-change: transform;
        }

        .pantone-pupil::after {
            content: '';
            position: absolute;
            top: 6px;
            left: 6px;
            width: 10px;
            height: 10px;
            background: #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
        }

        .pantone-card-text {
            width: 100%;
            height: 25%;
            padding: 20px 24px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            background: #ffffff;
        }

        .pantone-brand {
            font-weight: 800;
            font-size: 1.2rem;
            color: #111;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
            line-height: 1.2;
        }

        .pantone-code {
            font-weight: 600;
            font-size: 0.9rem;
            color: #555;
            margin-bottom: 2px;
            line-height: 1.2;
        }

        .pantone-name {
            font-weight: 400;
            font-size: 0.85rem;
            color: #888;
            line-height: 1.2;
        }
      `}} />
      <div className="pantone-component">
        <div className="pantone-scene">
          <div className="pantone-card" ref={cardRef}>
            <div className="pantone-glare" ref={glareRef}></div>
            
            <div className="pantone-card-color">
              <div className="pantone-eye">
                <div className="pantone-pupil" ref={pupilLeftRef}></div>
              </div>
              <div className="pantone-eye">
                <div className="pantone-pupil" ref={pupilRightRef}></div>
              </div>
            </div>

            <div className="pantone-card-text">
              <div className="pantone-brand">PANTONE&reg;</div>
              <div className="pantone-code">18-3838 TCX</div>
              <div className="pantone-name">Ultra Violet</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
