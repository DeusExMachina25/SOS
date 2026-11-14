/**
 * The floorplan sketcher's data. Everything is in metres, measured from the
 * top-left of the drawing (x to the right, y downwards).
 */

export interface Point {
  x: number;
  y: number;
}

/** What the plan is of. Decides the item library and which experts can review it. */
export type PlanKind = "interior" | "garden" | "plot";

export interface Wall {
  id: string;
  a: Point;
  b: Point;
  /** Plot boundaries and garden edges draw thinner and dashed. */
  style?: "wall" | "boundary";
}

/** A door or window set into a wall. */
export interface Opening {
  id: string;
  kind: "door" | "window";
  wallId: string;
  /** Centre of the opening along the wall, 0 (end a) to 1 (end b). */
  t: number;
  /** Width in metres. */
  width: number;
}

/** A named area. Drawn as a rectangle, which also adds its four walls. */
export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The walls this room added, so moving the room moves them too. */
  wallIds: string[];
}

/** A piece from the item library (a bed, a tree, a car), placed by its centre. */
export interface Item {
  id: string;
  type: string;
  x: number;
  y: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** Size in metres, when resized away from the library size. */
  w?: number;
  h?: number;
}

export interface Plan {
  version: 1;
  name: string;
  kind: PlanKind;
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  items: Item[];
}

export type PlanPart = "wall" | "opening" | "room" | "item";

export interface Selection {
  part: PlanPart;
  id: string;
}

export function emptyPlan(kind: PlanKind = "interior", name = "My plan"): Plan {
  return { version: 1, name, kind, walls: [], openings: [], rooms: [], items: [] };
}
