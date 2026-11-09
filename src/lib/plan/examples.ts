import { addItem, addOpening, addRoom, addWall } from "./edit";
import { emptyPlan, type Plan, type PlanKind } from "./types";

/** A starting plan for each kind, so a first visit isn't a blank page. */
export function examplePlan(kind: PlanKind): Plan {
  let p = emptyPlan(kind, { interior: "Two-room flat", garden: "Back garden", plot: "Corner plot" }[kind]);

  if (kind === "interior") {
    p = addRoom(p, { x: 0, y: 0 }, { x: 4, y: 3.5 }, "Living");
    p = addRoom(p, { x: 4, y: 0 }, { x: 7.5, y: 3.5 }, "Bedroom");
    p = addRoom(p, { x: 4, y: 3.5 }, { x: 7.5, y: 5.5 }, "Bath");
    const [living, bedroom, bath] = p.rooms;
    const wall = (roomWalls: string[], side: number) => roomWalls[side];
    p = addOpening(p, "door", wall(living.wallIds, 2), 0.3);
    p = addOpening(p, "door", wall(bedroom.wallIds, 3), 0.75);
    p = addOpening(p, "door", wall(bath.wallIds, 0), 0.2);
    p = addOpening(p, "window", wall(living.wallIds, 0), 0.5);
    p = addOpening(p, "window", wall(bedroom.wallIds, 0), 0.5);
    p = addItem(p, "sofa", { x: 2, y: 2.9 });
    p = addItem(p, "bed-double", { x: 5.75, y: 1.2 });
    return p;
  }

  if (kind === "garden") {
    for (const [a, b] of [
      [{ x: 0, y: 0 }, { x: 12, y: 0 }],
      [{ x: 12, y: 0 }, { x: 12, y: 9 }],
      [{ x: 12, y: 9 }, { x: 0, y: 9 }],
      [{ x: 0, y: 9 }, { x: 0, y: 0 }],
    ]) p = addWall(p, a, b, "boundary");
    p = addItem(p, "path", { x: 6, y: 7 });
    p = addItem(p, "tree", { x: 2, y: 2 });
    p = addItem(p, "bed-plant", { x: 9.5, y: 1.2 });
    p = addItem(p, "bench", { x: 9, y: 6 });
    return p;
  }

  for (const [a, b] of [
    [{ x: 0, y: 0 }, { x: 18, y: 0 }],
    [{ x: 18, y: 0 }, { x: 18, y: 15 }],
    [{ x: 18, y: 15 }, { x: 0, y: 15 }],
    [{ x: 0, y: 15 }, { x: 0, y: 0 }],
  ]) p = addWall(p, a, b, "boundary");
  p = addItem(p, "house", { x: 9, y: 6.5 });
  p = addItem(p, "car", { x: 2.5, y: 11.5 });
  p = addItem(p, "gate", { x: 2.5, y: 14.9 });
  p = addItem(p, "tree", { x: 15, y: 12 });
  return p;
}
