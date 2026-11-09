"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HoldToConfirm from "./HoldToConfirm";

/**
 * A branded replacement for the browser's confirm() popup.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Refund this session?", message: "…", action: "Refund" }))) return;
 *
 * The person holds a button to confirm, then gets a few seconds to undo before
 * the promise resolves. The caller only runs the action once it resolves true,
 * so "undo" means the action never started.
 */
export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Verb on the hold button, e.g. "Refund". */
  action: string;
  tone?: "danger" | "primary";
  /** Seconds to offer undo after the hold completes. 0 skips it. */
  undoSeconds?: number;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Outside a ConfirmProvider (e.g. a page rendered on its own in a test) this falls back to window.confirm. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  return (
    ctx ??
    (async (opts) => window.confirm(opts.message ? `${opts.title}\n\n${opts.message}` : opts.title))
  );
}

type Pending = { opts: ConfirmOptions; resolve: (ok: boolean) => void };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [undoLeft, setUndoLeft] = useState<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    return new Promise<boolean>((resolve) => {
      setUndoLeft(null);
      setPending({ opts, resolve });
    });
  }, []);

  const finish = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
      setUndoLeft(null);
      returnFocus.current?.focus?.();
    },
    [pending]
  );

  // Countdown for the undo window; resolves true when it reaches zero.
  useEffect(() => {
    if (undoLeft === null) return;
    const t = setTimeout(() => (undoLeft <= 1 ? finish(true) : setUndoLeft(undoLeft - 1)), 1000);
    return () => clearTimeout(t);
  }, [undoLeft, finish]);

  useEffect(() => {
    if (!pending) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, finish]);

  const onHeld = () => {
    const secs = pending?.opts.undoSeconds ?? 4;
    if (secs > 0) setUndoLeft(secs);
    else finish(true);
  };

  const opts = pending?.opts;
  const undoTotal = opts?.undoSeconds ?? 4;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-[var(--bg-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && undoLeft === null) finish(false);
            }}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby={opts.message ? "confirm-message" : undefined}
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="glass-panel w-full max-w-md border border-[var(--border-strong)] p-7"
            >
              <h2 id="confirm-title" className="font-display text-2xl font-bold text-[var(--text-primary)]">
                {opts.title}
              </h2>
              {opts.message && (
                <p id="confirm-message" className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--text-muted)]">
                  {opts.message}
                </p>
              )}

              {undoLeft === null ? (
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={() => finish(false)}
                    className="border border-[var(--border)] px-5 py-3 font-mono-sos text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <HoldToConfirm label={opts.action} tone={opts.tone ?? "danger"} onConfirm={onHeld} />
                </div>
              ) : (
                <div className="mt-7" aria-live="polite">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-mono-sos text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
                      {opts.action} in {undoLeft}s
                    </p>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => finish(false)}
                      className="border border-[var(--color-primary)] px-5 py-2.5 font-mono-sos text-[10px] tracking-[0.2em] uppercase text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-2)]"
                    >
                      Undo
                    </button>
                  </div>
                  <div className="mt-4 h-[2px] w-full bg-[var(--border)]">
                    <motion.div
                      className="h-full origin-left bg-[var(--color-primary)]"
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0 }}
                      transition={{ duration: undoTotal, ease: "linear" }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
