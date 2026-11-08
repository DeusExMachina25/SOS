"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, type AnimationPlaybackControls } from "framer-motion";

/**
 * A button that only fires after it is held down for `holdMs`.
 * A fill sweeps across while held; letting go early drains it and nothing happens.
 * Works with a mouse, touch, and the keyboard (hold Space or Enter).
 *
 * Use it for actions that are hard to undo, such as refunds, payouts and deletes.
 */
export default function HoldToConfirm({
  label,
  onConfirm,
  holdMs = 1200,
  tone = "danger",
  disabled = false,
  className = "",
}: {
  label: string;
  onConfirm: () => void;
  holdMs?: number;
  tone?: "danger" | "primary";
  disabled?: boolean;
  className?: string;
}) {
  const progress = useMotionValue(0);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const done = useRef(false);
  const [holding, setHolding] = useState(false);

  useEffect(() => () => controls.current?.stop(), []);

  const start = () => {
    if (disabled || done.current) return;
    setHolding(true);
    controls.current?.stop();
    // Resume from wherever the fill is, so a quick re-press doesn't restart from zero.
    const remaining = holdMs * (1 - progress.get());
    controls.current = animate(progress, 1, {
      duration: remaining / 1000,
      ease: "linear",
      onComplete: () => {
        done.current = true;
        setHolding(false);
        onConfirm();
      },
    });
  };

  const cancel = () => {
    if (done.current) return;
    setHolding(false);
    controls.current?.stop();
    controls.current = animate(progress, 0, { duration: 0.25, ease: "easeOut" });
  };

  const fill = tone === "danger" ? "bg-[var(--color-orange)]/30" : "bg-[var(--color-primary)]/25";
  const border = tone === "danger" ? "border-[var(--color-orange)]/60" : "border-[var(--color-primary)]/60";

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`Hold to ${label.toLowerCase()}`}
      className={`relative overflow-hidden select-none touch-none border ${border} bg-[var(--bg-surface-2)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] uppercase text-[var(--text-primary)] transition-transform disabled:opacity-50 ${
        holding ? "scale-[0.98]" : ""
      } ${className}`}
    >
      <motion.span
        aria-hidden
        className={`absolute inset-0 origin-left ${fill}`}
        style={{ scaleX: progress }}
      />
      <span className="relative">{holding ? "Keep holding…" : `Hold to ${label}`}</span>
    </button>
  );
}
