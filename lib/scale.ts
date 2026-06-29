import type { Box2D, Point } from "@/schemas/annotation";

/**
 * Coordinate helpers. Gemma normalizes each axis independently to 0..1000, so
 * when the stage container is sized to the image's exact aspect ratio we can map
 * straight to CSS percentages with no letterboxing math.
 */

export function centerOf(box: Box2D): Point {
  const [y1, x1, y2, x2] = box;
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

export function clamp01k(v: number): number {
  return Math.max(0, Math.min(1000, v));
}

export function pctPoint(p: Point): { left: string; top: string } {
  return { left: `${clamp01k(p.x) / 10}%`, top: `${clamp01k(p.y) / 10}%` };
}

export function pctBox(box: Box2D): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  const [y1, x1, y2, x2] = box;
  const left = clamp01k(Math.min(x1, x2));
  const top = clamp01k(Math.min(y1, y2));
  const right = clamp01k(Math.max(x1, x2));
  const bottom = clamp01k(Math.max(y1, y2));
  return {
    left: `${left / 10}%`,
    top: `${top / 10}%`,
    width: `${(right - left) / 10}%`,
    height: `${(bottom - top) / 10}%`,
  };
}
