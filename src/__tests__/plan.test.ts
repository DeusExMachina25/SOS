import { describe, expect, it } from "vitest";

import { CATEGORIES, ITEMS, PLAN_KINDS, itemSize, itemsFor } from "@/lib/plan/catalog";
import { addItem, addOpening, addRoom, addWall, commit, duplicateItem, move, redo, remove, resizeItem, resizeRoom, setDimension, setWallLength, startHistory, undo } from "@/lib/plan/edit";
import { examplePlan } from "@/lib/plan/examples";
import { formatLength, nearestWall, snap, straighten } from "@/lib/plan/geometry";
import { GUEST_LIMITS, blockedReason } from "@/lib/plan/limits";
import { parsePlan } from "@/lib/plan/storage";
import { emptyPlan } from "@/lib/plan/types";

describe("plan geometry", () => {
  it("snaps to the 10 cm grid without float noise", () => {
    expect(snap({ x: 1.234, y: 0.29999 })).toEqual({ x: 1.2, y: 0.3 });
  });

  it("straightens nearly level walls", () => {
    expect(straighten({ x: 0, y: 0 }, { x: 4, y: 0.3 })).toEqual({ x: 4, y: 0 });
    expect(straighten({ x: 0, y: 0 }, { x: 0.2, y: 3 })).toEqual({ x: 0, y: 3 });
    expect(straighten({ x: 0, y: 0 }, { x: 2, y: 2 })).toEqual({ x: 2, y: 2 });
  });

  it("formats lengths in metres and centimetres", () => {
    expect(formatLength(3.6)).toBe("3.6 m");
    expect(formatLength(4)).toBe("4 m");
    expect(formatLength(0.45)).toBe("45 cm");
  });
});

describe("plan editing", () => {
  it("a room adds four walls, and moving it moves them", () => {
    let p = addRoom(emptyPlan(), { x: 4, y: 3 }, { x: 0, y: 0 }, "Living");
    expect(p.rooms[0]).toMatchObject({ x: 0, y: 0, w: 4, h: 3 });
    expect(p.walls).toHaveLength(4);
    p = move(p, { part: "room", id: p.rooms[0].id }, 1, 0.5);
    expect(p.rooms[0]).toMatchObject({ x: 1, y: 0.5 });
    expect(p.walls[0].a).toEqual({ x: 1, y: 0.5 });
  });

  it("ignores rooms too small to be real", () => {
    const p = emptyPlan();
    expect(addRoom(p, { x: 0, y: 0 }, { x: 0.2, y: 3 }, "x")).toBe(p);
  });

  it("removing a room removes its walls and their doors", () => {
    let p = addRoom(emptyPlan(), { x: 0, y: 0 }, { x: 4, y: 3 }, "Living");
    p = addOpening(p, "door", p.walls[0].id, 0.5);
    p = remove(p, { part: "room", id: p.rooms[0].id });
    expect(p.walls).toHaveLength(0);
    expect(p.openings).toHaveLength(0);
  });

  it("sets a wall's length from its first end", () => {
    let p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 3, y: 0 });
    p = setWallLength(p, p.walls[0].id, 4.5);
    expect(p.walls[0].b).toEqual({ x: 4.5, y: 0 });
  });

  it("finds the wall under a tap", () => {
    const p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(nearestWall({ x: 1, y: 0.1 }, p.walls, 0.2)?.t).toBeCloseTo(0.25);
    expect(nearestWall({ x: 1, y: 1 }, p.walls, 0.2)).toBeNull();
  });

  it("undoes and redoes", () => {
    let h = startHistory(emptyPlan());
    h = commit(h, addWall(h.present, { x: 0, y: 0 }, { x: 1, y: 0 }));
    h = undo(h);
    expect(h.present.walls).toHaveLength(0);
    h = redo(h);
    expect(h.present.walls).toHaveLength(1);
  });
});

describe("free version limits", () => {
  it("caps rooms for guests only", () => {
    let p = emptyPlan();
    for (let i = 0; i < GUEST_LIMITS.rooms; i++) p = addRoom(p, { x: i * 5, y: 0 }, { x: i * 5 + 4, y: 3 }, "r");
    expect(blockedReason(p, "rooms", "guest")).toMatch(/Sign in/);
    expect(blockedReason(p, "rooms", "member")).toBeNull();
  });

  it("keeps library items behind sign-in", () => {
    const p = emptyPlan();
    expect(blockedReason(p, "items", "guest", 1, "sofa")).toBeNull();
    expect(blockedReason(p, "items", "guest", 1, "wardrobe")).toMatch(/library/);
  });

  it("every example fits inside the free limits", () => {
    for (const kind of ["interior", "garden", "plot"] as const) {
      const p = examplePlan(kind);
      for (const part of ["rooms", "walls", "openings", "items"] as const) {
        expect(p[part].length).toBeLessThanOrEqual(GUEST_LIMITS[part]);
      }
    }
  });
});

describe("expert types", () => {
  it("matches who can work on what", () => {
    expect(PLAN_KINDS.interior.experts).toEqual(["architect", "interior"]);
    expect(PLAN_KINDS.plot.experts).toEqual(["architect", "landscape"]);
    expect(PLAN_KINDS.garden.experts).toContain("landscape");
  });

  it("every kind has free items", () => {
    for (const kind of ["interior", "garden", "plot"] as const) expect(itemsFor(kind).some((i) => i.guest)).toBe(true);
  });
});

describe("reading stored plans", () => {
  it("round-trips a plan", () => {
    const p = examplePlan("interior");
    expect(parsePlan(JSON.parse(JSON.stringify(p)))).toEqual({ ...p, walls: p.walls.map((w) => ({ ...w, style: w.style ?? "wall" })) });
  });

  it("drops malformed parts and rejects junk", () => {
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan({ version: 2 })).toBeNull();
    const p = parsePlan({ version: 1, kind: "spaceship", walls: [{ id: "w", a: { x: 0, y: 0 }, b: { x: "1", y: 0 } }], openings: [{ id: "o", wallId: "nope", t: 0.5, width: 1, kind: "door" }] });
    expect(p?.kind).toBe("interior");
    expect(p?.walls).toHaveLength(0);
    expect(p?.openings).toHaveLength(0);
  });

  it("keeps items", () => {
    const p = addItem(emptyPlan("garden"), "tree", { x: 1, y: 1 });
    expect(parsePlan(p)?.items).toHaveLength(1);
  });
});

describe("resizing and copying", () => {
  it("resizes a room from its top-left corner, walls and all", () => {
    const base = addRoom(emptyPlan(), { x: 1, y: 1 }, { x: 4, y: 3 }, "Den");
    const r = base.rooms[0];
    const next = resizeRoom(base, r.id, 5, 4);
    expect(next.rooms[0]).toMatchObject({ x: 1, y: 1, w: 5, h: 4 });
    const xs = next.walls.flatMap((w) => [w.a.x, w.b.x]);
    const ys = next.walls.flatMap((w) => [w.a.y, w.b.y]);
    expect(Math.max(...xs)).toBe(6);
    expect(Math.max(...ys)).toBe(5);
  });

  it("typing a room wall's length resizes the room along that wall", () => {
    const base = addRoom(emptyPlan(), { x: 0, y: 0 }, { x: 4, y: 3 }, "Den");
    const top = base.walls[0];
    const side = base.walls[1];
    expect(setDimension(base, top.id, 5).rooms[0]).toMatchObject({ w: 5, h: 3 });
    expect(setDimension(base, side.id, 2.5).rooms[0]).toMatchObject({ w: 4, h: 2.5 });
  });

  it("typing a loose wall's length changes only that wall", () => {
    const base = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(setDimension(base, base.walls[0].id, 3).walls[0].b).toEqual({ x: 3, y: 0 });
  });

  it("resizes and duplicates items, and stored plans keep the size", () => {
    let p = addItem(emptyPlan(), "sofa", { x: 1, y: 1 });
    const id = p.items[0].id;
    p = resizeItem(p, id, 2.4, 0.97);
    expect(itemSize(p.items[0])).toEqual({ w: 2.4, h: 1 });
    p = duplicateItem(p, id);
    expect(p.items).toHaveLength(2);
    expect(p.items[1]).toMatchObject({ x: 1.5, y: 1.5, w: 2.4 });
    expect(p.items[1].id).not.toBe(id);
    expect(parsePlan(JSON.parse(JSON.stringify(p)))?.items[0]).toMatchObject({ w: 2.4, h: 1 });
  });

  it("every library item sits on a known shelf", () => {
    for (const i of ITEMS) expect(Object.keys(CATEGORIES)).toContain(i.category);
  });
});
