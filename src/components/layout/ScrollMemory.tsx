"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Restores where you were when you press Back/Forward. The long scroll-driven
 * pages build their height after hydration, so the browser's own restoration
 * lands too early (and on `/us` we measured it dropping people at the top).
 * We remember the position per path and, on a history navigation only, retry
 * until the page is tall enough to reach it.
 */
export default function ScrollMemory() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    const key = `sos_scroll:${pathname}`;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          sessionStorage.setItem(key, String(Math.round(window.scrollY)));
        } catch {
          /* storage blocked */
        }
      }, 120);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.removeEventListener("scroll", save);
      clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    const key = `sos_scroll:${pathname}`;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const viaHistory = window.__sosPop === true || nav?.type === "back_forward" || nav?.type === "reload";
    window.__sosPop = false;
    if (!viaHistory) return;

    let target = 0;
    try {
      target = Number(sessionStorage.getItem(key) ?? 0);
    } catch {
      /* storage blocked */
    }
    if (!target) return;

    let tries = 0;
    const attempt = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= target - 2 || tries > 20) {
        window.scrollTo(0, Math.min(target, Math.max(maxScroll, 0)));
        return;
      }
      tries += 1;
      timer = setTimeout(attempt, 100);
    };
    let timer = setTimeout(attempt, 60);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      window.__sosPop = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return null;
}

declare global {
  interface Window {
    __sosPop?: boolean;
  }
}
