"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let start = 0;
    const end = 100;
    const duration = 1200; // 1.2s ease
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressFraction = Math.min(elapsed / duration, 1);
      
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progressFraction, 3);
      
      setProgress(Math.floor(easeProgress * 100));

      if (progressFraction < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => setLoading(false), 300);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--color-primary)]"
        >
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="font-display italic text-6xl mb-4"
          >
            S
          </motion.div>
          <div className="font-mono-sos text-sm tracking-widest">
            {progress}%
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
