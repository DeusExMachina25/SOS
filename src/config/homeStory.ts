/**
 * THE ORDER OF THE HOME PAGE SCROLL STORY.
 *
 * The opening (H1, the SOS logo flying through the camera) always plays
 * first. The beats below follow it, top to bottom, as you scroll.
 *
 *   - Reorder: move a line up or down.
 *   - Remove a beat: delete its line (it stays in the code).
 *
 * Copy alternates left and right on a laptop and sits under the picture on a
 * phone. Beats that share a picture (the compass, the floorplan, the nine-dot
 * puzzle) keep it on screen while they play one after another.
 * What each beat says and shows: src/components/home/homeBeats.tsx.
 *
 * Not playing right now (add a line back to restore):
 *   "H6", // "Grounded in Trust" + floorplan sketch
 */
import type { HomeBeatId } from "@/components/home/homeBeats";

export const HOME_STORY: HomeBeatId[] = [
  "H2", // "The Art of Second Opinions" + compass
  "H3", // "Too Close to the Canvas" + compass
  "H4", // "Why a Second Opinion" + compass (tilts into 3D)
  "H5", // "How a Session Works" + booking steps + floorplan sketch
  "H7", // "Don't just think it..." + nine-dot puzzle
  "H8", // "We prefer to ACT outside the box" + Find Your Expert
];
