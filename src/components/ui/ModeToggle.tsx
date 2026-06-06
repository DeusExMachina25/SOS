"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ModeToggle() {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Retrieve theme from localStorage or default to dark
    const savedTheme = localStorage.getItem("sos-theme") as "dark" | "light" | null;
    if (savedTheme) {
      setMode(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleMode = () => {
    const newMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
    document.documentElement.setAttribute("data-theme", newMode);
    localStorage.setItem("sos-theme", newMode);
  };

  if (!mounted) return null;

  return (
    <button 
      onClick={toggleMode}
      className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)] transition-colors"
      aria-label="Toggle Mode"
    >
      {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
