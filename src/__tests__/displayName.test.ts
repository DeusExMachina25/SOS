import { describe, it, expect } from "vitest";
import { normalizeDisplayName, DISPLAY_NAME_MAX } from "@/lib/data/format";

describe("normalizeDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeDisplayName("  Sarah   Jenkins \n")).toEqual({ ok: true, name: "Sarah Jenkins" });
  });

  it("keeps non-Latin names and emoji intact", () => {
    expect(normalizeDisplayName("श्रवणी रेड्डी")).toEqual({ ok: true, name: "श्रवणी रेड्डी" });
    expect(normalizeDisplayName("José Müller-Øster")).toEqual({ ok: true, name: "José Müller-Øster" });
  });

  it("rejects empty, whitespace-only and one-character names", () => {
    for (const bad of ["", "   ", "\t\n", "A"]) {
      expect(normalizeDisplayName(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it("rejects names that are too long, but accepts the exact limit", () => {
    expect(normalizeDisplayName("a".repeat(DISPLAY_NAME_MAX)).ok).toBe(true);
    expect(normalizeDisplayName("a".repeat(DISPLAY_NAME_MAX + 1)).ok).toBe(false);
  });

  it("rejects control characters", () => {
    expect(normalizeDisplayName("Sarah\u0000Jenkins").ok).toBe(false);
    expect(normalizeDisplayName("Sarah\u0007Jenkins").ok).toBe(false);
  });

  it("explains why it failed", () => {
    const r = normalizeDisplayName("A");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least 2/);
  });
});
