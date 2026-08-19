import React from "react";

/**
 * The SOS wordmark, per "SOS Mark Final" from the logo redesign.
 *
 * Silkscreen 700 letterforms with a 2x3 dot grid inset into each glyph.
 * Every dimension is expressed in em against the design's 58px reference,
 * so the whole mark scales from a single font-size on the root element.
 */

/* Design reference: 58px type. px / 58 = em */
const EM = (px: number) => `${(px / 58).toFixed(4)}em`;

/** Dot grid slots, row-major across 2 columns x 3 rows. */
type Slot = null | "sm" | "lg";
const PATTERN_S: Slot[] = [null, "sm", "lg", null, "sm", null];
const PATTERN_O: Slot[] = ["sm", null, null, "lg", "sm", null];

interface SosMarkProps {
  className?: string;
  /** Rendered as the accessible name; pass null when a parent already labels it */
  label?: string | null;
}

function Letter({ glyph, pattern }: { glyph: string; pattern: Slot[] }) {
  return (
    <span
      className="sos-mark-letter"
      style={{ width: EM(62), height: EM(90) }}
    >
      <span className="sos-mark-glyph">{glyph}</span>
      <span
        className="sos-mark-grid"
        style={{
          top: EM(28),
          left: EM(14),
          width: EM(34),
          height: EM(34),
          gap: EM(4)
        }}
      >
        {pattern.map((slot, i) =>
          slot === null ? (
            <span key={i} />
          ) : (
            <span
              key={i}
              className="sos-mark-cell"
              style={{ width: EM(9), height: EM(9), borderRadius: EM(2) }}
            >
              <span
                className="sos-mark-dot"
                style={{
                  width: EM(slot === "lg" ? 8 : 4),
                  height: EM(slot === "lg" ? 8 : 4),
                  borderRadius: EM(1)
                }}
              />
            </span>
          )
        )}
      </span>
    </span>
  );
}

export default function SosMark({ className = "", label = "SOS" }: SosMarkProps) {
  return (
    <span
      className={`sos-mark ${className}`}
      style={{ gap: EM(8) }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <Letter glyph="S" pattern={PATTERN_S} />
      <Letter glyph="O" pattern={PATTERN_O} />
      <Letter glyph="S" pattern={PATTERN_S} />
    </span>
  );
}
