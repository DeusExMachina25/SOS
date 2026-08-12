"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Smartphone, Copy, Check, Loader2 } from "lucide-react";
import { payMockRazorpay, markUpiPaymentSent } from "@/lib/data/queries";
import { formatInr } from "@/lib/data/format";
import type { Payment } from "@/lib/data/types";

/**
 * Post-booking payment step. Two paths:
 *  - Razorpay: fully MOCKED demo (Route needs RBI compliance this account
 *    doesn't have yet — see supabase/migrations/0009_payments_phase2.sql).
 *  - Direct UPI: real, functional today. Client pays the expert directly
 *    and self-reports; the expert confirms receipt from their side.
 */
export default function PaymentModal({
  sessionId,
  amountInr,
  expertName,
  expertUpiId,
  onClose,
  onPaid,
}: {
  sessionId: string;
  amountInr: number | null;
  expertName: string;
  expertUpiId: string | null;
  onClose: () => void;
  onPaid?: (payment: Payment) => void;
}) {
  const [mode, setMode] = useState<"choose" | "upi_sent">("choose");
  const [loading, setLoading] = useState<"razorpay" | "upi" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleMockRazorpay = async () => {
    setError("");
    setLoading("razorpay");
    try {
      const payment = await payMockRazorpay(sessionId);
      onPaid?.(payment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(null);
    }
  };

  const handleUpiSent = async () => {
    setError("");
    setLoading("upi");
    try {
      const payment = await markUpiPaymentSent(sessionId, amountInr ?? 0);
      onPaid?.(payment);
      setMode("upi_sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = () => {
    if (!expertUpiId) return;
    navigator.clipboard.writeText(expertUpiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-[var(--bg-overlay)] backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="glass-panel p-10 max-w-lg w-full relative border-organic shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-[var(--text-muted)] hover:text-white transition-colors p-2 rounded-full hover:bg-[var(--bg-surface-2)] z-50"
          >
            <X size={24} />
          </button>

          {mode === "choose" ? (
            <>
              <h2 className="font-display text-4xl font-bold mb-4 text-embossed">Complete Payment</h2>
              <p className="text-lg text-[var(--text-muted)] mb-2">
                {formatInr(amountInr)} to {expertName}
              </p>
              <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest mb-10">
                Choose how you&apos;d like to pay
              </p>

              {error && (
                <p className="text-sm text-red-400 font-mono-sos mb-6 text-center">{error}</p>
              )}

              <div className="space-y-4">
                {/* Direct UPI — real, functional */}
                <div className="p-6 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Smartphone size={20} className="text-emerald-400" />
                    <h3 className="font-bold text-[var(--text-primary)]">Pay via UPI</h3>
                  </div>
                  {expertUpiId ? (
                    <>
                      <p className="text-xs text-[var(--text-muted)] mb-4">
                        Send {formatInr(amountInr)} directly to your expert&apos;s UPI ID, then confirm below.
                      </p>
                      <div className="flex items-center gap-3 mb-4">
                        <code className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] font-mono-sos">
                          {expertUpiId}
                        </code>
                        <button
                          onClick={handleCopy}
                          className="w-11 h-11 shrink-0 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-400/50 transition-all"
                          title="Copy UPI ID"
                        >
                          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                      </div>
                      <button
                        onClick={handleUpiSent}
                        disabled={loading !== null}
                        className="w-full py-3 rounded-xl bg-emerald-400/10 border border-emerald-400/40 text-emerald-400 text-sm font-bold hover:bg-emerald-400/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading === "upi" ? <Loader2 size={16} className="animate-spin" /> : null}
                        I&apos;ve Sent the Payment
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">
                      This expert hasn&apos;t set up UPI payments yet.
                    </p>
                  )}
                </div>

                {/* Razorpay — mocked demo */}
                <div className="p-6 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl opacity-90">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard size={20} className="text-[var(--color-primary)]" />
                    <h3 className="font-bold text-[var(--text-primary)]">Pay via Razorpay</h3>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full border border-orange-400/20">Demo</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    Escrow checkout — currently simulated while Route approval is pending. No real charge will occur.
                  </p>
                  <button
                    onClick={handleMockRazorpay}
                    disabled={loading !== null}
                    className="w-full py-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)] text-[var(--text-primary)] text-sm font-bold hover:border-[var(--color-primary)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading === "razorpay" ? <Loader2 size={16} className="animate-spin" /> : null}
                    Simulate Razorpay Payment
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <h2 className="font-display text-3xl font-bold mb-4 text-[var(--text-primary)]">Payment Sent</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-10">
                We&apos;ve notified your expert. Once they confirm receipt, this session will be marked as paid.
              </p>
              <button
                onClick={onClose}
                className="btn-sos-filled w-full py-4 text-sm text-center justify-center rounded-2xl tracking-widest"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
