"use client";

import React, { useId, useState } from "react";
import Reveal from "./Reveal";
import { submitInquiry, type InquirySource } from "@/lib/inquiries";

interface LetsTalkProps {
  /** Which page the inquiry is filed under (the database accepts "us" or "platter"). */
  source: InquirySource;
  /** The Us page version: bigger type and a long empty run-up above it. */
  spacious?: boolean;
}

/**
 * "Let's Talk." quote and the inquiry form (blocks U8 and P8).
 * One component, so a fix to the form lands on every page that shows it.
 */
export default function LetsTalk({ source, spacious = false }: LetsTalkProps) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const privacyId = useId();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setState("sending");
    setError("");
    const result = await submitInquiry(new FormData(form), source);
    if (!result.ok) {
      setState("error");
      setError(result.error);
      return;
    }
    form.reset();
    setState("sent");
  };

  const field =
    `w-full bg-transparent border-b border-[var(--border-strong)] px-0 text-[var(--text-primary)] font-inter focus:outline-none focus:border-[var(--text-primary)] transition-colors rounded-none placeholder-[var(--text-muted)] placeholder-opacity-30 text-center ` +
    (spacious ? "py-3 text-xl" : "py-2 text-lg");
  const label =
    "block font-mono-sos text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase transition-colors group-focus-within:text-[var(--text-primary)] text-center " +
    (spacious ? "mb-4" : "mb-3");

  return (
    <Reveal className="w-full border-t border-[var(--border)] bg-[var(--bg-base)] z-10 relative">
      <div
        className={`container mx-auto px-6 w-full flex flex-col items-center ${
          spacious ? "pt-[100vh] pb-40 md:pt-[200vh] md:pb-64" : "py-24"
        }`}
      >
        <div className={`flex flex-col items-center w-full max-w-4xl text-center ${spacious ? "mb-24 md:mb-32" : "mb-16"}`}>
          <h2 className={`font-display font-normal text-[var(--text-primary)] tracking-tight ${spacious ? "text-5xl md:text-7xl mb-24" : "text-5xl md:text-7xl mb-12"}`}>
            Let&apos;s Talk.
          </h2>

          <div className={`relative flex flex-col items-center w-full ${spacious ? "mb-16" : "mb-8"}`}>
            <div
              className={`font-editorial text-[var(--text-primary)] opacity-[0.03] leading-none absolute select-none pointer-events-none ${
                spacious ? "text-[10rem] md:text-[15rem] -top-20 md:-top-32" : "text-[10rem] md:text-[12rem] -top-16"
              }`}
            >
              &ldquo;
            </div>
            <p className={`font-editorial text-[var(--text-primary)] opacity-90 leading-tight font-normal italic max-w-3xl mx-auto relative z-10 ${spacious ? "text-2xl md:text-4xl" : "text-xl md:text-3xl"}`}>
              &ldquo;Every relationship begins with a great idea...&rdquo;
            </p>
          </div>

          <p className={`font-inter text-[var(--text-muted)] leading-relaxed font-light max-w-xl mx-auto ${spacious ? "text-lg md:text-xl mb-20" : "text-base md:text-lg mb-12"}`}>
            You bring the ideas, we build a great relation and the ship sets sail. Drop us a line below to initiate the dialogue.
          </p>
          <div className={`w-px bg-[var(--border-strong)] mx-auto ${spacious ? "h-24" : "h-16"}`}></div>
        </div>

        <div className="w-full max-w-xl mx-auto flex flex-col items-center relative z-20">
          <form className={`w-full flex flex-col items-center relative ${spacious ? "gap-y-16" : "gap-y-12"}`} onSubmit={handleSubmit}>
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Leave this field empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>

            <div className="relative group w-full text-center">
              <label className={label}>Full Name *</label>
              <input type="text" name="full_name" aria-label="Full name" maxLength={200} autoComplete="name" required className={field} placeholder="Jane Doe" />
            </div>

            <div className="relative group w-full text-center">
              <label className={label}>E-mail *</label>
              <input type="email" name="email" aria-label="Email" maxLength={320} autoComplete="email" required className={field} placeholder="jane@example.com" />
            </div>

            <div className="relative group w-full text-center">
              <label className={label}>Subject</label>
              <input type="text" name="subject" aria-label="Subject" maxLength={300} className={field} placeholder="Project Inquiry" />
            </div>

            <div className="relative group w-full text-center">
              <label className={label}>Message *</label>
              <textarea
                rows={1}
                name="message"
                aria-label="Message"
                maxLength={5000}
                required
                className={`${field} resize-none ${spacious ? "min-h-[120px]" : "min-h-[100px]"}`}
                placeholder="Tell us about your vision..."
              ></textarea>
            </div>

            <div className="flex items-center justify-center mt-2 w-full">
              <input
                type="checkbox"
                id={privacyId}
                required
                className="w-4 h-4 rounded-sm border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] focus:ring-[var(--text-primary)] focus:ring-offset-0 focus:ring-offset-[var(--bg-base)] cursor-pointer"
              />
              <label htmlFor={privacyId} className="ml-3 font-inter text-sm text-[var(--text-muted)] cursor-pointer select-none">
                I acknowledge the <a href="/privacy" target="_blank" rel="noopener" className="text-[var(--text-primary)] underline underline-offset-4 transition-colors">privacy policy</a>.
              </label>
            </div>

            <div className={`text-center w-full flex flex-col items-center gap-4 ${spacious ? "mt-12" : "mt-8"}`}>
              <button
                type="submit"
                disabled={state === "sending"}
                className={`bg-[var(--text-primary)] text-[var(--bg-base)] font-mono-sos text-xs tracking-[0.3em] uppercase hover:opacity-80 transition-opacity duration-300 w-full md:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-wait ${spacious ? "px-16 py-6" : "px-12 py-4"}`}
              >
                {state === "sending" ? "Sending…" : "Submit Inquiry"}
              </button>
              <p
                role="status"
                aria-live="polite"
                className={`font-inter text-sm min-h-[20px] ${state === "error" ? "text-[var(--color-orange)]" : "text-[var(--text-muted)]"}`}
              >
                {state === "sent" && "Thanks — we've got it. We'll reply within two working days."}
                {state === "error" && error}
              </p>
            </div>
          </form>
        </div>
      </div>
    </Reveal>
  );
}
