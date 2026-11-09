import type { PlanKind } from "./types";

/**
 * What can be drawn, and who can review it.
 *
 *   - PLAN_KINDS: the three kinds of plan, and the expert types that can work on each.
 *   - ITEMS: the item library. `guest: true` items are open before sign-in;
 *     the rest unlock after signing in.
 */

export type ExpertType = "architect" | "landscape" | "interior";

export const EXPERT_TYPES: Record<ExpertType, { name: string; does: string }> = {
  architect: { name: "Architects", does: "home interiors, gardens and plots" },
  landscape: { name: "Landscape designers", does: "plots and gardens" },
  interior: { name: "Interior designers", does: "home and garden decor and interiors" },
};

export const PLAN_KINDS: Record<PlanKind, { name: string; hint: string; experts: ExpertType[] }> = {
  interior: { name: "Home interior", hint: "Rooms, doors, windows and furniture", experts: ["architect", "interior"] },
  garden: { name: "Garden", hint: "Beds, paths, trees and outdoor seating", experts: ["architect", "landscape", "interior"] },
  plot: { name: "Plot", hint: "Boundary, building footprint, parking and setbacks", experts: ["architect", "landscape"] },
};

export type ItemShape = "rect" | "round";

export interface ItemDef {
  type: string;
  name: string;
  /** Size in metres before rotation. */
  w: number;
  h: number;
  shape: ItemShape;
  kinds: PlanKind[];
  guest?: boolean;
}

export const ITEMS: ItemDef[] = [
  // Home interior
  { type: "bed-double", name: "Double bed", w: 1.6, h: 2.0, shape: "rect", kinds: ["interior"], guest: true },
  { type: "sofa", name: "Sofa", w: 2.0, h: 0.9, shape: "rect", kinds: ["interior"], guest: true },
  { type: "table-dining", name: "Dining table", w: 1.6, h: 0.9, shape: "rect", kinds: ["interior"], guest: true },
  { type: "counter", name: "Kitchen counter", w: 2.4, h: 0.6, shape: "rect", kinds: ["interior"], guest: true },
  { type: "bed-single", name: "Single bed", w: 0.9, h: 1.9, shape: "rect", kinds: ["interior"] },
  { type: "wardrobe", name: "Wardrobe", w: 1.8, h: 0.6, shape: "rect", kinds: ["interior"] },
  { type: "desk", name: "Desk", w: 1.2, h: 0.6, shape: "rect", kinds: ["interior"] },
  { type: "armchair", name: "Armchair", w: 0.8, h: 0.8, shape: "rect", kinds: ["interior"] },
  { type: "table-round", name: "Round table", w: 1.0, h: 1.0, shape: "round", kinds: ["interior", "garden"] },
  { type: "wc", name: "WC", w: 0.4, h: 0.7, shape: "rect", kinds: ["interior"] },
  { type: "basin", name: "Basin", w: 0.6, h: 0.45, shape: "rect", kinds: ["interior"] },
  { type: "shower", name: "Shower", w: 0.9, h: 0.9, shape: "rect", kinds: ["interior"] },
  { type: "stairs", name: "Stairs", w: 1.0, h: 3.0, shape: "rect", kinds: ["interior"] },

  // Garden
  { type: "tree", name: "Tree", w: 3.0, h: 3.0, shape: "round", kinds: ["garden", "plot"], guest: true },
  { type: "bed-plant", name: "Planting bed", w: 2.0, h: 1.0, shape: "rect", kinds: ["garden"], guest: true },
  { type: "path", name: "Path", w: 1.0, h: 4.0, shape: "rect", kinds: ["garden", "plot"], guest: true },
  { type: "bench", name: "Bench", w: 1.5, h: 0.5, shape: "rect", kinds: ["garden"], guest: true },
  { type: "shrub", name: "Shrub", w: 1.0, h: 1.0, shape: "round", kinds: ["garden"] },
  { type: "pond", name: "Pond", w: 2.5, h: 1.8, shape: "round", kinds: ["garden"] },
  { type: "deck", name: "Deck", w: 3.0, h: 3.0, shape: "rect", kinds: ["garden"] },
  { type: "pergola", name: "Pergola", w: 3.0, h: 3.0, shape: "rect", kinds: ["garden"] },
  { type: "lawn", name: "Lawn", w: 5.0, h: 4.0, shape: "rect", kinds: ["garden"] },

  // Plot
  { type: "house", name: "Building footprint", w: 10.0, h: 8.0, shape: "rect", kinds: ["plot"], guest: true },
  { type: "car", name: "Parking space", w: 2.5, h: 5.0, shape: "rect", kinds: ["plot"], guest: true },
  { type: "gate", name: "Gate", w: 3.0, h: 0.3, shape: "rect", kinds: ["plot"], guest: true },
  { type: "driveway", name: "Driveway", w: 3.0, h: 8.0, shape: "rect", kinds: ["plot"] },
  { type: "water-tank", name: "Water tank", w: 1.5, h: 1.5, shape: "round", kinds: ["plot"] },
  { type: "pool", name: "Pool", w: 8.0, h: 4.0, shape: "rect", kinds: ["plot", "garden"] },
];

export function itemDef(type: string): ItemDef | undefined {
  return ITEMS.find((i) => i.type === type);
}

export function itemsFor(kind: PlanKind): ItemDef[] {
  return ITEMS.filter((i) => i.kinds.includes(kind));
}
