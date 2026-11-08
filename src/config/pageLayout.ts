/**
 * WHICH BLOCKS SHOW ON WHICH PAGE, AND IN WHAT ORDER.
 *
 * This is the only file you need to edit to rearrange the Us and Platter
 * pages, or to add a block under the home page's scroll story.
 *
 *   - Move a block: cut its line from one list and paste it into another.
 *   - Reorder: move the line up or down within its list.
 *   - Remove a block from a page: delete its line (the block stays in the
 *     code, so you can bring it back any time).
 *
 * The codes match the SOS Section Picker. What each one is: see
 * src/components/blocks/registry.tsx.
 */
import type { BlockId } from "@/components/blocks/registry";

export const PAGE_LAYOUT: Record<"home" | "us" | "platter", BlockId[]> = {
  /** Shown after the home page's scroll story, above the footer. */
  home: [
    "P5", // How booking works: Choose, Brief, Meet
  ],

  us: [
    "U1", // Hero: giant "US" over a drifting photo
    "U2", // The Genesis 001: Every render hides a section
    "U3", // The Genesis 002: Invited, not listed
    "U6", // Keep your eyes on the prize (Pantone eyes)
    "U7", // Editorial: three article cards
  ],

  platter: [
    "P1", // Hero: Approaching projects from a different ANGLE
    "P2", // "The Platter" title and intro
    "P3", // The Collective: field pie (picks the expert for P4)
    "P4", // Expert profile card
    "P7", // We've got a lot to talk about
    "P8", // Let's Talk + contact form (Platter version)
  ],
};

/*
 * Not on any page right now (still in the code, add a line above to bring one back):
 *   U4  The Genesis 003: Measured on what stands
 *   U5  The Manifesto: four pillars build a temple
 *   U8  Let's Talk + contact form (Us version)
 *   P6  Investment: one rate per expert
 */
