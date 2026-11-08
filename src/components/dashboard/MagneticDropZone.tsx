"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/**
 * A file drop target that "wakes up" when a file is dragged anywhere on the page
 * and pulls its icon toward the file as it gets close. Clicking (or Enter/Space)
 * still opens the normal file picker, so it works without drag-and-drop too.
 */
export default function MagneticDropZone({
  onFiles,
  onClick,
  icon,
  title,
  hint,
  children,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(false); // a file is being dragged somewhere on the page
  const [over, setOver] = useState(false); // ...and it is over this zone

  // Icon offset and zone scale, driven by how close the dragged file is.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScale = useMotionValue(1);
  const x = useSpring(rawX, { stiffness: 260, damping: 20 });
  const y = useSpring(rawY, { stiffness: 260, damping: 20 });
  const scale = useSpring(rawScale, { stiffness: 300, damping: 22 });

  useEffect(() => {
    let depth = 0; // dragenter/dragleave fire for every child element, so count them
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const reset = () => {
      depth = 0;
      setArmed(false);
      setOver(false);
      rawX.set(0);
      rawY.set(0);
      rawScale.set(1);
    };

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setArmed(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) reset();
    };
    const onMove = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // Stops the browser from opening a file dropped just outside the zone.
      e.preventDefault();
      const el = ref.current;
      if (!el || reduce) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const reach = Math.max(r.width, r.height) * 0.9;
      const pull = Math.max(0, 1 - Math.hypot(dx, dy) / reach);
      const cap = 28;
      rawX.set(Math.max(-cap, Math.min(cap, dx * 0.18 * pull)));
      rawY.set(Math.max(-cap, Math.min(cap, dy * 0.18 * pull)));
      rawScale.set(1 + 0.025 * pull);
    };
    const onWindowDrop = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
      reset();
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onMove);
    window.addEventListener("drop", onWindowDrop);
    window.addEventListener("dragend", reset);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onMove);
      window.removeEventListener("drop", onWindowDrop);
      window.removeEventListener("dragend", reset);
    };
  }, [reduce, rawX, rawY, rawScale]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length && !disabled) onFiles(files);
  };

  const ring = over
    ? "border-[var(--color-green)] bg-[var(--color-green)]/10"
    : armed
      ? "border-[var(--color-green)]/60 bg-[var(--bg-surface-2)]"
      : "border-[var(--border-strong)] bg-[var(--bg-surface-2)] hover:border-[var(--color-green)]";

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`${title}. ${hint}`}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = disabled ? "none" : "copy";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={handleDrop}
      style={{ scale }}
      className={`w-full border-2 border-dashed rounded-[32px] p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center mb-12 group outline-none focus-visible:border-[var(--color-green)] ${ring}`}
    >
      <motion.div
        style={{ x, y }}
        animate={over && !reduce ? { scale: 1.12 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className={`w-20 h-20 rounded-full border flex items-center justify-center mb-6 transition-colors pointer-events-none ${
          armed ? "bg-[var(--color-green)]/10 border-[var(--color-green)]/40" : "bg-[var(--bg-surface)] border-[var(--border-strong)] group-hover:bg-[var(--color-green)]/10 group-hover:border-[var(--color-green)]/30"
        }`}
      >
        {icon}
      </motion.div>
      <h2 className="font-display text-2xl font-bold mb-2 text-[var(--text-primary)] group-hover:text-[var(--color-green)] transition-colors pointer-events-none">
        {over ? "Let go to upload" : armed ? "Drop it here" : title}
      </h2>
      <p className="text-sm text-[var(--text-muted)] font-inter mb-6 pointer-events-none">{hint}</p>
      {children}
    </motion.div>
  );
}
