"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";

const STEP_MS = 4200;

const STEPS = [
  { label: "Pick a vetted expert", caption: "Browse the Platter by field." },
  { label: "Book a time and pay", caption: "Only free slots are shown. Pay in one step." },
  { label: "Meet with your files at hand", caption: "Secure video, drawings in your private vault." },
] as const;

/** True for people who prefer reduced motion: scenes render in their final state. */
const Still = createContext(false);

// `initial: false` makes a motion element start at its end state, so nothing animates.
const draw = (still: boolean, delay = 0) => ({
  initial: still ? (false as const) : { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { pathLength: { delay, duration: 0.9, ease: "easeOut" as const }, opacity: { delay, duration: 0.2 } },
});

const rise = (still: boolean, delay = 0) => ({
  initial: still ? (false as const) : { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

/** Step 1: three field cards slide in; the middle one lifts and is picked. */
function ExpertScene() {
  const still = useContext(Still);
  const fields = ["ARCHITECTURE", "SUSTAINABILITY", "TRAVEL"];
  return (
    <g>
      {fields.map((field, i) => {
        const x = 30 + i * 120;
        const picked = i === 1;
        return (
          <motion.g key={field} {...rise(still, 0.1 + i * 0.12)}>
            <motion.g
              initial={still ? false : undefined}
              animate={picked ? { y: -12 } : { y: 0 }}
              transition={{ delay: 1.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <rect x={x} y={50} width={100} height={140} rx={14} className="fill-[var(--bg-surface-2)] stroke-[var(--border-strong)]" />
              {picked && (
                <motion.rect
                  x={x} y={50} width={100} height={140} rx={14} fill="none"
                  className="stroke-[var(--color-primary)]" strokeWidth={1.5}
                  {...draw(still, 1.3)}
                />
              )}
              <circle cx={x + 50} cy={92} r={18} fill="none" className="stroke-[var(--text-muted)]" />
              <rect x={x + 22} y={124} width={56} height={5} rx={2.5} className="fill-[var(--text-faint)]" />
              <rect x={x + 30} y={136} width={40} height={4} rx={2} className="fill-[var(--text-faint)]" />
              <text x={x + 50} y={172} textAnchor="middle" className="fill-[var(--text-muted)] font-mono-sos" fontSize={8} letterSpacing={1.2}>
                {field}
              </text>
            </motion.g>
          </motion.g>
        );
      })}
      <motion.g {...rise(still, 1.8)}>
        <rect x={170} y={208} width={60} height={20} rx={10} className="fill-[var(--color-primary)]" />
        <text x={200} y={222} textAnchor="middle" className="fill-[var(--bg-base)] font-mono-sos" fontSize={8} fontWeight={700}>
          PICKED
        </text>
      </motion.g>
    </g>
  );
}

/** Step 2: a week of slots appears, one is chosen, then a paid tick draws on. */
function BookingScene() {
  const still = useContext(Still);
  const cols = 7;
  const rows = 3;
  const chosen = { c: 4, r: 1 };
  return (
    <g>
      <motion.text {...rise(still, 0)} x={60} y={42} className="fill-[var(--text-muted)] font-mono-sos" fontSize={8} letterSpacing={1.5}>
        MON  TUE  WED  THU  FRI  SAT  SUN
      </motion.text>
      {Array.from({ length: rows * cols }, (_, n) => {
        const c = n % cols;
        const r = Math.floor(n / cols);
        const isChosen = c === chosen.c && r === chosen.r;
        return (
          <motion.rect
            key={n}
            x={56 + c * 42} y={54 + r * 36} width={34} height={26} rx={6}
            initial={still ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 + n * 0.02, duration: 0.3 }}
            style={{ transformOrigin: `${73 + c * 42}px ${67 + r * 36}px` }}
            className={isChosen ? "fill-[var(--bg-surface-2)] stroke-[var(--border-strong)]" : "fill-[var(--bg-surface)] stroke-[var(--border)]"}
          />
        );
      })}
      <motion.rect
        x={56 + chosen.c * 42} y={54 + chosen.r * 36} width={34} height={26} rx={6}
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.3 }}
        className="fill-[var(--color-primary)]"
      />
      <motion.g {...rise(still, 1.6)}>
        <rect x={130} y={176} width={140} height={40} rx={20} className="fill-[var(--bg-surface-2)] stroke-[var(--border-strong)]" />
        <circle cx={154} cy={196} r={11} fill="none" className="stroke-[var(--color-primary)]" strokeWidth={1.5} />
        <motion.path d="M149 196 l4 4 l7 -8" fill="none" className="stroke-[var(--color-primary)]" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...draw(still, 2.0)} />
        <text x={176} y={199} className="fill-[var(--text-primary)] font-mono-sos" fontSize={9} letterSpacing={1}>
          BOOKED · PAID
        </text>
      </motion.g>
    </g>
  );
}

/** Step 3: a call window opens beside a plan; markup and a lock land on the plan. */
function SessionScene() {
  const still = useContext(Still);
  return (
    <g>
      <motion.g {...rise(still, 0.1)}>
        <rect x={30} y={44} width={160} height={120} rx={12} className="fill-[var(--bg-surface-2)] stroke-[var(--border-strong)]" />
        <circle cx={110} cy={92} r={20} fill="none" className="stroke-[var(--text-muted)]" />
        <path d="M80 140 q30 -26 60 0" fill="none" className="stroke-[var(--text-muted)]" />
        <motion.circle
          cx={176} cy={56} r={4} className="fill-[var(--color-green)]"
          animate={still ? undefined : { opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      </motion.g>
      <g fill="none" className="stroke-[var(--text-primary)]" strokeWidth={1.2}>
        <motion.path d="M215 50 h150 v110 h-150 z" {...draw(still, 0.3)} />
        <motion.path d="M215 105 h80 v55 M295 50 v40 h70" {...draw(still, 0.6)} />
        <motion.path d="M250 105 v-12" {...draw(still, 0.9)} />
      </g>
      <motion.ellipse
        cx={330} cy={130} rx={26} ry={18} fill="none"
        className="stroke-[var(--color-orange)]" strokeWidth={2}
        {...draw(still, 1.5)}
      />
      <motion.text {...rise(still, 2.0)} x={300} y={178} className="fill-[var(--color-orange)] font-mono-sos" fontSize={8} letterSpacing={1}>
        WIDEN THIS?
      </motion.text>
      <motion.g {...rise(still, 2.4)}>
        <rect x={130} y={190} width={140} height={34} rx={17} className="fill-[var(--bg-surface-2)] stroke-[var(--border-strong)]" />
        <rect x={147} y={204} width={12} height={10} rx={2} className="fill-[var(--color-primary)]" />
        <path d="M149 204 v-3 a4 4 0 0 1 8 0 v3" fill="none" className="stroke-[var(--color-primary)]" strokeWidth={1.5} />
        <text x={168} y={211} className="fill-[var(--text-primary)] font-mono-sos" fontSize={8} letterSpacing={1}>
          PRIVATE VAULT
        </text>
      </motion.g>
    </g>
  );
}

const SCENES = [ExpertScene, BookingScene, SessionScene];

/**
 * "How SOS works" in three looping steps, for first-time visitors.
 * Auto-advances only while on screen and not hovered; people who prefer
 * reduced motion get a still scene per step and change steps themselves.
 */
export default function HowItWorks({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  const autoplay = inView && !paused && !reduceMotion;

  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [autoplay, step]);

  const Scene = SCENES[step];

  return (
    <Still.Provider value={!!reduceMotion}>
    <div
      ref={rootRef}
      role="region"
      aria-label="How SOS works"
      className={`w-[min(88vw,520px)] glass-panel rounded-[28px] border border-[var(--border-strong)] p-5 md:p-6 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="font-mono-sos text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] mb-3">How SOS works</p>

      <div className="relative w-full aspect-[8/5]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.svg
            key={step}
            viewBox="0 0 400 250"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Scene />
          </motion.svg>
        </AnimatePresence>
      </div>

      <div className="mt-4 min-h-[3.5rem]" aria-live="polite">
        <p className="font-display text-xl md:text-2xl text-[var(--text-primary)] tracking-tight">
          <span className="font-mono-sos text-xs text-[var(--color-orange)] mr-3 align-middle">0{step + 1}</span>
          {STEPS[step].label}
        </p>
        <p className="font-sans text-sm text-[var(--text-muted)] mt-1">{STEPS[step].caption}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStep(i)}
            aria-label={`Step ${i + 1}: ${s.label}`}
            aria-current={i === step ? "step" : undefined}
            className="group py-2 cursor-pointer"
          >
            <span className="block h-[3px] w-full rounded-full bg-[var(--border-strong)] overflow-hidden">
              {i === step && (
                <motion.span
                  key={`${step}-${autoplay}`}
                  className="block h-full bg-[var(--color-primary)] origin-left"
                  initial={{ scaleX: autoplay ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: autoplay ? STEP_MS / 1000 : 0, ease: "linear" }}
                />
              )}
              {i < step && <span className="block h-full bg-[var(--text-faint)]" />}
            </span>
          </button>
        ))}
      </div>
    </div>
    </Still.Provider>
  );
}
