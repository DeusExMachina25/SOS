"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export default function NineDotLoop() {
  const linesRef = useRef<SVGGElement>(null);
  const pencilRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!linesRef.current || !pencilRef.current) return;

    const linesG = linesRef.current;
    const pencil = pencilRef.current;

    interface Segment {
      from: { x: number; y: number };
      to: { x: number; y: number };
      color: string;
    }

    const segments: Segment[] = [
      { from: { x: 140, y: 140 }, to: { x: 20, y: 20 }, color: '#FF5B2E' },
      { from: { x: 20, y: 20 }, to: { x: 140, y: 20 }, color: '#B8CF4F' },
      { from: { x: 140, y: 20 }, to: { x: 20, y: 140 }, color: '#7C4DFF' },
      { from: { x: 20, y: 140 }, to: { x: 20, y: 20 }, color: '#2A0089' },
    ];

    const ctx = gsap.context(() => {
      function makeLine(seg: Segment) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', String(seg.from.x));
        l.setAttribute('y1', String(seg.from.y));
        l.setAttribute('x2', String(seg.from.x));
        l.setAttribute('y2', String(seg.from.y));
        l.setAttribute('stroke', seg.color);
        l.setAttribute('stroke-width', '2');
        l.setAttribute('stroke-linecap', 'round');
        l.setAttribute('marker-end', 'url(#ah)');
        linesG.appendChild(l);
        return l;
      }

      function runCycle() {
        linesG.innerHTML = '';
        const lines = segments.map(makeLine);
        gsap.set(pencil, { attr: { cx: segments[0].from.x, cy: segments[0].from.y, opacity: 1 } });

        const tl = gsap.timeline({
          onComplete: () => {
            gsap.to(pencil, {
              attr: { opacity: 0 }, duration: 0.3, onComplete: () => {
                gsap.delayedCall(0.5, runCycle);
              }
            });
          }
        });

        segments.forEach((seg, i) => {
          tl.to(lines[i], {
            attr: { x2: seg.to.x, y2: seg.to.y },
            duration: 1.0,
            ease: 'power2.inOut',
          }, i === 0 ? '+=0.3' : '+=0.15');
          tl.to(pencil, {
            attr: { cx: seg.to.x, cy: seg.to.y },
            duration: 1.0,
            ease: 'power2.inOut'
          }, '<');
        });
      }

      runCycle();
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex justify-center w-full py-8 pointer-events-none z-10 relative">
      <svg viewBox="0 0 160 160" className="overflow-visible w-48 h-48 md:w-72 md:h-72">
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <g ref={linesRef} id="lines"></g>
        <g id="dots">
          {[
            { cx: 20, cy: 20 }, { cx: 60, cy: 20 }, { cx: 100, cy: 20 },
            { cx: 20, cy: 60 }, { cx: 60, cy: 60 }, { cx: 100, cy: 60 },
            { cx: 20, cy: 100 }, { cx: 60, cy: 100 }, { cx: 100, cy: 100 },
          ].map((dot, i) => (
            <circle key={i} cx={dot.cx} cy={dot.cy} r="4" fill="var(--text-primary)" opacity="0.8" />
          ))}
        </g>
        <circle ref={pencilRef} id="pencil" r="4" fill="none" stroke="#FF5B2E" strokeWidth="2" opacity="0" />
      </svg>
    </div>
  );
}
