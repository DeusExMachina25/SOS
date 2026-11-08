"use client";

import { motion, useReducedMotion } from "framer-motion";

export interface ReceiptRow {
  label: string;
  value: string;
}

/**
 * A paper-style receipt with a torn bottom edge.
 *
 * - Before payment it is a summary of what the client is about to book.
 * - After payment, pass `printing` and it feeds out of a slot like a till receipt.
 *
 * The `print-receipt` class lets "Print / save as PDF" print only this receipt
 * (see the @media print rule in globals.css).
 */
export default function Receipt({
  heading,
  reference,
  details,
  lines,
  total,
  stamp,
  note,
  printing = false,
}: {
  heading: string;
  /** Short reference printed under the heading, e.g. a receipt number. */
  reference?: string;
  details: ReceiptRow[];
  lines: ReceiptRow[];
  total: ReceiptRow;
  stamp?: { text: string; tone: "paid" | "due" | "pending" };
  note?: string;
  printing?: boolean;
}) {
  const reduce = useReducedMotion();
  const animateIn = printing && !reduce;

  const stampColour =
    stamp?.tone === "paid" ? "border-[var(--bg-base)] text-[var(--bg-base)]" : "border-[var(--bg-base)]/50 text-[var(--bg-base)]/60";

  const paper = (
    <motion.div
      initial={animateIn ? { y: "-100%" } : false}
      animate={{ y: "0%" }}
      // Eases in and out, like paper feeding out of a till printer.
      transition={animateIn ? { duration: 1.6, ease: [0.45, 0.05, 0.55, 0.95] } : undefined}
      className="print-receipt relative bg-[var(--text-primary)] text-[var(--bg-base)] px-6 pt-6 pb-9 font-mono-sos receipt-edge"
    >
      <div className="text-center">
        <p className="text-[11px] tracking-[0.35em] font-bold">SOS</p>
        <p className="mt-1 text-[10px] tracking-[0.25em] uppercase opacity-70">{heading}</p>
        {reference && <p className="mt-1 text-[9px] tracking-[0.2em] opacity-50">{reference}</p>}
      </div>

      <Divider />

      <dl className="space-y-1.5 text-[11px]">
        {details.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <dt className="opacity-60 shrink-0">{r.label}</dt>
            <dd className="text-right break-words min-w-0">{r.value}</dd>
          </div>
        ))}
      </dl>

      <Divider />

      <dl className="space-y-1.5 text-[11px]">
        {lines.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <dt>{r.label}</dt>
            <dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 border-t-2 border-[var(--bg-base)] pt-3 flex justify-between text-sm font-bold">
        <span className="uppercase tracking-[0.15em]">{total.label}</span>
        <span className="tabular-nums">{total.value}</span>
      </div>

      {stamp && (
        <div className="mt-5 flex justify-center">
        <motion.div
          initial={animateIn ? { scale: 1.6, opacity: 0, rotate: -18 } : false}
          animate={{ scale: 1, opacity: 1, rotate: -8 }}
          transition={animateIn ? { delay: 1.7, type: "spring", damping: 12, stiffness: 260 } : undefined}
          className={`border-2 px-3 py-1 text-xs font-bold tracking-[0.3em] uppercase ${stampColour}`}
        >
          {stamp.text}
        </motion.div>
        </div>
      )}

      {note && <p className="mt-5 text-center text-[10px] leading-relaxed opacity-60">{note}</p>}
    </motion.div>
  );

  if (!printing) return paper;

  // The "printer": a slot the paper feeds out of.
  return (
    <div>
      <div className="h-2 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-strong)] relative z-10" aria-hidden />
      <div className="overflow-hidden -mt-1 mx-2">{paper}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-4 border-t border-dashed border-[var(--bg-base)]/30" aria-hidden />;
}
