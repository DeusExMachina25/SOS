/**
 * Card fills for the dashboard. Each maps to a --tint-* token in
 * globals.css, which is itself derived from the brand palette, so a tone
 * never introduces a new hue and works in both themes.
 */
export type Tone = 1 | 2 | 3 | 4 | "plain";

// Spelled out in full so Tailwind can see every class name at build time.
const BG: Record<Tone, string> = {
  1: "bg-[var(--tint-1)]",
  2: "bg-[var(--tint-2)]",
  3: "bg-[var(--tint-3)]",
  4: "bg-[var(--tint-4)]",
  plain: "bg-[var(--tint-plain)]",
};

export function toneBg(tone: Tone): string {
  return BG[tone];
}

/** Cycles through the four tones, for lists of cards. */
export function toneAt(index: number): Exclude<Tone, "plain"> {
  return ((index % 4) + 1) as 1 | 2 | 3 | 4;
}
