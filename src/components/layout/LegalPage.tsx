import React from "react";
import { SITE } from "@/lib/site";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="w-full max-w-3xl mx-auto px-6 py-20 md:py-28">
      <p className="font-mono-sos text-xs tracking-[0.25em] uppercase text-[var(--text-muted)] mb-6">
        Last updated {SITE.legalUpdated}
      </p>
      <h1 className="font-editorial text-5xl md:text-7xl text-[var(--text-primary)] tracking-tight mb-8">
        {title}
      </h1>
      {intro && (
        <p className="font-inter text-lg md:text-xl text-[var(--text-muted)] leading-relaxed font-light mb-12">
          {intro}
        </p>
      )}
      <div className="legal-prose">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl md:text-3xl text-[var(--text-primary)] mb-4 tracking-tight">
        {title}
      </h2>
      <div className="font-inter text-base md:text-lg text-[var(--text-muted)] leading-relaxed font-light space-y-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-[var(--text-primary)] [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-[var(--text-primary)] [&_strong]:font-medium">
        {children}
      </div>
    </section>
  );
}
