import { itemDef } from "./catalog";
import type { Plan } from "./types";

/**
 * What a visitor can do before signing in, and what signing in unlocks.
 * Change the numbers here to loosen or tighten the free version.
 */

export type Tier = "guest" | "member";

export const GUEST_LIMITS = {
  rooms: 4,
  walls: 30,
  openings: 6,
  items: 8,
};

export type Countable = keyof typeof GUEST_LIMITS;

export const MEMBER_PERKS = [
  "Unlimited rooms, walls and items",
  "The full item library",
  "Save as many plans as you like to your account",
  "Download your plan as an image",
];

/** Null when the addition is allowed, or a short reason it isn't. */
export function blockedReason(plan: Plan, part: Countable, tier: Tier, adding = 1, itemType?: string): string | null {
  if (tier === "member") return null;
  if (part === "items" && itemType && !itemDef(itemType)?.guest) {
    return "Sign in to use the full item library.";
  }
  const count = plan[part].length;
  if (count + adding > GUEST_LIMITS[part]) {
    const what = { rooms: "rooms", walls: "walls", openings: "doors and windows", items: "items" }[part];
    return `The free sketcher allows ${GUEST_LIMITS[part]} ${what}. Sign in for unlimited.`;
  }
  return null;
}
