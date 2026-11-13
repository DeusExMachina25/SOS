"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface ArrowChipProps {
  /** What the chip opens, read out by screen readers */
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * The square arrow button in the corner of a dashboard card. A link when
 * given `href`, a button when given `onClick`. Square on purpose: cards
 * are rounded, chips are not.
 */
export default function ArrowChip({ label, href, onClick, className = "" }: ArrowChipProps) {
  const classes = `group/chip flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--border-strong)] bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--bg-base)] ${className}`;
  const icon = (
    <ArrowUpRight
      size={16}
      strokeWidth={1.75}
      className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/chip:translate-x-0.5 group-hover/chip:-translate-y-0.5"
    />
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={classes}>
      {icon}
    </button>
  );
}
