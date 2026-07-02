"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const duration = 1500; // 1.5s visual progression
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressFraction = Math.min(elapsed / duration, 1);
      
      // easeOutCubic curve to slow down progress towards the end (highly cinematic)
      const easeProgress = 1 - Math.pow(1 - progressFraction, 3);
      
      setProgress(Math.floor(easeProgress * 100));

      if (progressFraction < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsExiting(true);
        // Sync with the 800ms exit animation duration
        setTimeout(() => setLoading(false), 800);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const translateYVal = isExiting ? "0vh" : `${(1 - progress / 100) * 75}vh`;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[10000] bg-[var(--bg-base)] text-[var(--text-primary)]"
        >
          {/* Vertical progress line */}
          <motion.div
            animate={{ 
              scaleY: isExiting ? 0 : progress / 100,
              originY: isExiting ? 0 : 1 // 0 is top, 1 is bottom
            }}
            transition={
              isExiting 
                ? { duration: 0.8, ease: [0.76, 0, 0.24, 1] } 
                : { duration: 0.1, ease: "easeOut" }
            }
            className="fixed top-0 w-2 h-full bg-[var(--color-primary)] z-[10001] left-0 md:left-auto md:right-0"
          />

          {/* Giant Rising Number Counter */}
          <div 
            className="fixed top-8 right-6 md:top-12 md:left-12 md:right-auto z-[10002] pointer-events-none select-none font-sans font-medium text-[6rem] md:text-[12rem] xl:text-[14rem] leading-none text-[var(--color-primary)]"
            style={{ 
              transform: `translateY(${translateYVal})`,
              transition: isExiting ? "none" : "transform 0.1s ease-out" 
            }}
          >
            <div className="overflow-hidden h-[1em] flex items-center justify-start">
              <motion.span
                animate={isExiting ? { y: "-100%" } : { y: "0%" }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                className="inline-block"
              >
                {Math.min(progress, 99)}
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
