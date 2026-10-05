"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
];

/** Minimal legal footer. Hidden inside the signed-in dashboards, which have their own shell. */
export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <footer className="relative z-10 w-full border-t border-[var(--border)] bg-[var(--bg-base)] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <p className="font-mono-sos text-xs tracking-widest uppercase text-[var(--text-muted)]">
          &copy; {new Date().getFullYear()} {SITE.name}
        </p>
        <nav aria-label="Legal and contact" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono-sos text-xs tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-2"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="font-mono-sos text-xs tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-2"
          >
            {SITE.contactEmail}
          </a>
        </nav>
      </div>
    </footer>
  );
}
