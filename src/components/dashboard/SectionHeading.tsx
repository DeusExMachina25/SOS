import React from "react";

interface SectionHeadingProps {
  children: React.ReactNode;
  /** Shown faint after the title, e.g. "Today (3)" */
  count?: number;
  /** Right-hand slot, e.g. a "Book" button */
  action?: React.ReactNode;
  id?: string;
}

/** A large editorial section title, the "Your activities today (5)" of the reference. */
export default function SectionHeading({ children, count, action, id }: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="font-editorial text-[28px] sm:text-[32px] leading-none tracking-tight text-[var(--text-primary)]">
        {children}
        {typeof count === "number" && (
          <span className="ml-2 text-[var(--text-faint)] tabular-nums">({count})</span>
        )}
      </h2>
      {action}
    </div>
  );
}
