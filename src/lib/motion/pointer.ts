/**
 * One "pointer" for every mouse-follow effect on the site.
 *
 * - On a computer (fine pointer) it is simply the mouse position.
 * - On a phone or tablet it is a virtual point driven by how the device is
 *   tilted (the gyroscope). Holding the phone the way you first picked it up
 *   puts the point in the middle of the screen; tilting it moves the point
 *   towards that edge.
 * - iPhones and iPads only share tilt after the visitor allows it, and the
 *   browser only shows that prompt in response to a tap, so we ask on the
 *   first tap anywhere on the page.
 * - If tilt is not available (no sensor, permission refused, reduced motion),
 *   dragging a finger moves the point instead.
 *
 * Effects call `subscribePointer` and get viewport coordinates in pixels,
 * exactly like `event.clientX / clientY`, so they do not need to know which
 * input is behind it.
 */

export interface PointerPoint {
  /** Horizontal position in viewport pixels (like clientX). */
  x: number;
  /** Vertical position in viewport pixels (like clientY). */
  y: number;
  source: "mouse" | "tilt" | "touch";
}

type Listener = (p: PointerPoint) => void;

/** Degrees of tilt away from the resting angle that reach the screen edge. */
const TILT_RANGE_DEG = 20;
/** How quickly the resting angle follows a new way of holding the phone. */
const REST_DRIFT = 0.01;
/** Ignore touch while tilt readings are arriving, so the two never fight. */
const TILT_FRESH_MS = 1000;

const listeners = new Set<Listener>();
let detach: (() => void) | null = null;

let rest: { a: number; b: number } | null = null;
let lastTiltAt = 0;

function emit(p: PointerPoint) {
  listeners.forEach((fn) => fn(p));
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Reads tilt as left/right (a) and forward/back (b), corrected for screen rotation. */
function readTilt(e: DeviceOrientationEvent): { a: number; b: number } | null {
  if (e.beta == null || e.gamma == null) return null;
  const angle = (window.screen?.orientation?.angle ?? 0) % 360;
  switch (angle) {
    case 90:
      return { a: e.beta, b: -e.gamma };
    case 270:
    case -90:
      return { a: -e.beta, b: e.gamma };
    case 180:
      return { a: -e.gamma, b: -e.beta };
    default:
      return { a: e.gamma, b: e.beta };
  }
}

function onOrientation(e: DeviceOrientationEvent) {
  const t = readTilt(e);
  if (!t) return;
  if (!rest) rest = { ...t };
  // Slowly re-centre so lying back on the sofa doesn't pin the point to an edge.
  rest.a += (t.a - rest.a) * REST_DRIFT;
  rest.b += (t.b - rest.b) * REST_DRIFT;

  const nx = clamp((t.a - rest.a) / TILT_RANGE_DEG);
  const ny = clamp((t.b - rest.b) / TILT_RANGE_DEG);
  lastTiltAt = performance.now();
  emit({
    x: ((nx + 1) / 2) * window.innerWidth,
    y: ((ny + 1) / 2) * window.innerHeight,
    source: "tilt",
  });
}

function attach(): () => void {
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups: (() => void)[] = [];

  if (finePointer) {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      emit({ x: e.clientX, y: e.clientY, source: "mouse" });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    cleanups.push(() => window.removeEventListener("pointermove", onMove));
    return () => cleanups.forEach((c) => c());
  }

  // Touch fallback: a dragged finger moves the point when tilt is quiet.
  const onTouch = (e: TouchEvent) => {
    if (performance.now() - lastTiltAt < TILT_FRESH_MS) return;
    const touch = e.touches[0];
    if (touch) emit({ x: touch.clientX, y: touch.clientY, source: "touch" });
  };
  window.addEventListener("touchmove", onTouch, { passive: true });
  cleanups.push(() => window.removeEventListener("touchmove", onTouch));

  if (!reduceMotion && typeof DeviceOrientationEvent !== "undefined") {
    // Listen straight away: browsers that need no permission start sending
    // tilt now, and the rest start once the visitor allows it below.
    window.addEventListener("deviceorientation", onOrientation);
    cleanups.push(() => window.removeEventListener("deviceorientation", onOrientation));

    const Orientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof Orientation.requestPermission === "function") {
      // iOS (and some newer browsers): the prompt can only open from a tap.
      const ask = () => {
        window.removeEventListener("touchend", ask);
        window.removeEventListener("click", ask);
        Orientation.requestPermission!().catch(() => {
          /* refused or unsupported: the finger-drag fallback stays on */
        });
      };
      window.addEventListener("touchend", ask, { once: true });
      window.addEventListener("click", ask, { once: true });
      cleanups.push(() => {
        window.removeEventListener("touchend", ask);
        window.removeEventListener("click", ask);
      });
    }
  }

  return () => cleanups.forEach((c) => c());
}

/**
 * Calls `fn` with the pointer position whenever it moves. Returns a function
 * that stops listening. Safe to call from any number of components; the
 * browser listeners are shared and removed when the last one unsubscribes.
 */
export function subscribePointer(fn: Listener): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(fn);
  if (!detach) detach = attach();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && detach) {
      detach();
      detach = null;
      rest = null;
    }
  };
}
