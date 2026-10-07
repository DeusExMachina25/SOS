"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import ModeToggle from "../ui/ModeToggle";
import SosMark from "../shared/SosMark";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { path: "/", label: "Home", num: "001//" },
  { path: "/platter", label: "Platter", num: "002//" },
  { path: "/us", label: "Us", num: "003//" },
  { path: "/login", label: "Login", num: "004//" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setVisible(false);
      } else {
        // Scrolling up
        setVisible(true);
      }

      setLastScrollY(currentScrollY);
      setScrolled(currentScrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // While the mobile menu is open: lock page scroll, close on Escape, and
  // close if the viewport grows past the breakpoint where the menu is hidden.
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Everything except the nav and the menu becomes unreachable, so Tab cannot wander into the page behind.
    const behind = [document.getElementById("main"), document.querySelector("footer")].filter(Boolean) as HTMLElement[];
    behind.forEach((el) => el.setAttribute("inert", ""));
    menuRef.current?.querySelector("a")?.focus();
    const button = menuButtonRef.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = prevOverflow;
      behind.forEach((el) => el.removeAttribute("inert"));
      button?.focus();
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [menuOpen]);

  const showBar = visible || menuOpen;

  return (
    <>
      <nav
        className={`sos-nav ${scrolled ? "py-3 scrolled" : "py-5"}`}
        style={{
          transition:
            "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s, padding 0.4s, opacity 0.4s ease",
          transform: showBar ? "translateY(0)" : "translateY(-100%)",
          opacity: showBar ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center"
            aria-label="SOS home"
            onClick={() => setMenuOpen(false)}
          >
            <SosMark className="text-[20px] md:text-[26px]" label={null} />
          </Link>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-link ${pathname === item.path ? "active" : ""}`}
                aria-current={pathname === item.path ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <button
              ref={menuButtonRef}
              type="button"
              className="md:hidden flex h-11 w-11 items-center justify-center text-[var(--text-primary)]"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Rendered outside <nav>: its backdrop-filter would otherwise become the containing block for this fixed overlay. */}
      {menuOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="md:hidden fixed inset-0 z-[999] flex flex-col justify-center bg-[var(--bg-base)] px-8"
        >
          <ul className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className="flex items-baseline gap-4 py-4 border-b border-[var(--border)]"
                  >
                    <span className="font-mono-sos text-xs tracking-widest text-[var(--text-muted)]">
                      {item.num}
                    </span>
                    <span
                      className={`font-display text-4xl tracking-tight ${
                        active ? "text-[var(--color-primary)]" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
