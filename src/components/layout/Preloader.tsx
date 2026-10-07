"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INTRO_MS = 900; // counter run time
const EXIT_MS = 700; // exit animation
const HARD_CAP_MS = 3000; // never hold the page longer than this, whatever the browser does

/**
 * Brand intro. Plays once per browser session (so navigating, refreshing or
 * returning never makes anyone wait again), is skipped entirely for people who
 * prefer reduced motion, and can never block the page for more than HARD_CAP_MS
 * even if the tab throttles animation frames. The overlay does not capture
 * pointer events. A tiny inline script in layout.tsx adds `html.sos-seen`
 * before first paint so returning visitors never see the overlay flash.
 */
export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("sos_intro") === "1";
    } catch {
      /* storage blocked: just play the intro */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time decision on mount
      setLoading(false);
      return;
    }

    let raf = 0;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    const startTime = performance.now();

    const markSeen = () => {
      try {
        sessionStorage.setItem("sos_intro", "1");
      } catch {
        /* storage blocked */
      }
    };

    const finish = () => {
      markSeen();
      setIsExiting(true);
      exitTimer = setTimeout(() => setLoading(false), EXIT_MS);
    };

    const animate = (now: number) => {
      const fraction = Math.min((now - startTime) / INTRO_MS, 1);
      setProgress(Math.floor((1 - Math.pow(1 - fraction, 3)) * 100));
      if (fraction < 1) raf = requestAnimationFrame(animate);
      else finish();
    };
    raf = requestAnimationFrame(animate);

    const cap = setTimeout(() => {
      markSeen();
      setLoading(false);
    }, HARD_CAP_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cap);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, []);

  const translateYVal = isExiting ? "0vh" : `${(1 - progress / 100) * 75}vh`;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          aria-hidden="true"
          className="sos-preloader pointer-events-none fixed inset-0 z-[10000] bg-[var(--bg-base)] text-[var(--text-primary)]"
        >
          {/* Vertical progress line */}
          <motion.div
            animate={{
              scaleY: isExiting ? 0 : progress / 100,
              originY: isExiting ? 0 : 1, // 0 is top, 1 is bottom
            }}
            transition={
              isExiting
                ? { duration: EXIT_MS / 1000, ease: [0.76, 0, 0.24, 1] }
                : { duration: 0.1, ease: "easeOut" }
            }
            className="fixed top-0 w-2 h-full bg-[var(--color-primary)] z-[10001] left-0 md:left-auto md:right-0"
          />

          {/* Giant Rising Number Counter */}
          <div
            className="fixed top-8 right-6 md:top-12 md:left-12 md:right-auto z-[10002] pointer-events-none select-none font-sans font-medium text-[6rem] md:text-[12rem] xl:text-[14rem] leading-none text-[var(--color-primary)]"
            style={{
              transform: `translateY(${translateYVal})`,
              transition: isExiting ? "none" : "transform 0.1s ease-out",
            }}
          >
            <div className="overflow-hidden h-[1em] flex items-center justify-start">
              <motion.span
                animate={isExiting ? { y: "-100%" } : { y: "0%" }}
                transition={{ duration: EXIT_MS / 1000, ease: [0.76, 0, 0.24, 1] }}
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
