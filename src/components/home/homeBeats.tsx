import React from "react";
import Link from "next/link";

import MorphingLogo from "./MorphingLogo";
import TypewriterText from "./TypewriterText";
import MinimalStoryBox from "./MinimalStoryBox";
import { BOOKING_STEPS } from "../blocks/platter/HowBooking";

/**
 * The beats of the home page scroll story: the copy each one shows and the
 * picture beside it. The order they play in is set in src/config/homeStory.ts.
 */

export type HomeVisual = "compass" | "diorama" | "ninedot";

export interface HomeBeat {
  /** The picture beside the copy. Beats in a row with the same one share it. */
  visual: HomeVisual;
  /** How the compass looks while this beat plays. */
  compassTilt?: "2d" | "2.5d" | "3d";
  /** Classes for the copy wrapper (width, layering). */
  copyClass?: string;
  /** Laptop: how far from centre the copy and picture sit (default 20vw). */
  copyX?: string;
  visualX?: string;
  /** Phone: where the copy and picture sit, and where the copy leaves to. */
  phoneCopyY?: string;
  phoneVisualY?: string;
  phoneCopyExitY?: string;
  content: React.ReactNode;
}

const TYPEWRITER_LINES = [
  { text: "The Art", colorClass: "text-[var(--text-primary)]" },
  { text: "of", colorClass: "text-[var(--text-muted)] pl-4 md:pl-12" },
  { text: "Second Opinions", colorClass: "text-[var(--color-primary)] pl-8 md:pl-24" },
];

const STORY_COPY = "z-20 w-full xl:w-auto";

export const HOME_BEATS = {
  H2: {
    visual: "compass",
    compassTilt: "2d",
    copyClass: "z-10",
    copyX: "19vw",
    visualX: "19vw",
    phoneCopyY: "-16vh",
    phoneVisualY: "20vh",
    phoneCopyExitY: "-34vh",
    content: <TypewriterText startTyping={true} lines={TYPEWRITER_LINES} />,
  },
  H3: {
    visual: "compass",
    compassTilt: "2.5d",
    copyClass: STORY_COPY,
    content: (
      <MinimalStoryBox
        title="Too Close to the Canvas"
        paragraphs={[
          "Every project is a leap of faith. You can either jump or hold on for dear life…",
          "If you're too close to the canvas, you restrict yourself from reaching out… and the further you carry it without any direction, the harder it becomes to make others see what you do.",
        ]}
      />
    ),
  },
  H4: {
    visual: "compass",
    compassTilt: "3d",
    copyClass: STORY_COPY,
    content: (
      <MinimalStoryBox
        title="Why a Second Opinion"
        paragraphs={[
          "Second Opinions see beyond the original facade and a fresh set of eyes can be the veneer to your plywood. Speak to one of our vetted experts who has no stake in your plan except making it truly yours.",
        ]}
      />
    ),
  },
  H5: {
    visual: "diorama",
    copyClass: STORY_COPY,
    content: (
      <MinimalStoryBox title="How a Session Works" paragraphs={["Three steps from a question to a second opinion."]}>
        {/* Booking steps, so how it works and how to book read as one beat */}
        <ol className="mt-6 xl:mt-10 grid grid-cols-3 gap-3 xl:gap-6">
          {BOOKING_STEPS.map((step) => (
            <li key={step.id} className="flex flex-col border-t border-[var(--border-strong)] pt-3 xl:pt-5">
              <span className="font-mono-sos text-[9px] xl:text-[10px] tracking-[0.3em] text-[var(--color-orange)] mb-2">{step.id}</span>
              <span className="font-editorial text-xl xl:text-3xl text-[var(--text-primary)] tracking-tight mb-1 xl:mb-2">{step.title}</span>
              <span className="font-inter text-[11px] xl:text-sm text-[var(--text-muted)] leading-snug font-light">{step.desc}</span>
            </li>
          ))}
        </ol>
      </MinimalStoryBox>
    ),
  },
  H6: {
    visual: "diorama",
    copyClass: STORY_COPY,
    content: (
      <MinimalStoryBox
        title="Grounded in Trust"
        paragraphs={[
          "You meet over secure video with your files at hand. Payment is held in escrow and released around the session. We believe that a true partnership can only be grounded in trust…",
          "Why don't we reassess our borders?",
        ]}
      />
    ),
  },
  H7: {
    visual: "ninedot",
    copyClass: STORY_COPY,
    visualX: "25vw",
    content: <MinimalStoryBox paragraphs={["Don't just think it..."]} />,
  },
  H8: {
    visual: "ninedot",
    copyClass: "z-40 flex flex-col items-center gap-8 w-full px-6 xl:w-[min(42vw,40rem)] xl:px-0",
    visualX: "25vw",
    phoneCopyY: "14vh",
    phoneVisualY: "-26vh",
    content: (
      <>
        <div className="font-display text-2xl md:text-3xl text-[var(--text-primary)] tracking-tight uppercase text-center mb-2 flex items-center justify-center gap-3 flex-wrap">
          We Prefer to <span className="inline-flex scale-75 md:scale-90"><MorphingLogo text="ACT" variant="embossed" /></span> Outside the Box
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-6">
            <Link href="/platter" className="btn-sos btn-sos-filled btn-sos-lg">
              Find Your Expert
            </Link>
          </div>
          <Link href="/login" className="font-mono-sos text-xs py-2 text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors">
            Already a member? Log in
          </Link>
          <p className="font-display text-sm md:text-base text-[var(--text-faint)] tracking-[0.2em] uppercase">
            Find a Compass
          </p>
        </div>
      </>
    ),
  },
} satisfies Record<string, HomeBeat>;

export type HomeBeatId = keyof typeof HOME_BEATS;
