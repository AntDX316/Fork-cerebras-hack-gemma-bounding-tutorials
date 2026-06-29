"use client";

import type { Annotation } from "@/schemas/annotation";
import { pctPoint } from "@/lib/scale";
import { ScoreBadge } from "./ScoreBadge";

export function Dot({
  a,
  active,
  ariaLabel,
  onEnter,
  onLeave,
}: {
  a: Annotation;
  active: boolean;
  ariaLabel: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const pos = pctPoint(a.point);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      style={{ left: pos.left, top: pos.top, zIndex: active ? 20 : 10 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      {a.scored && (
        <div className="mb-1">
          <ScoreBadge score={a.score} color={a.color} />
        </div>
      )}
      <div
        className={`rounded-full border-2 border-white shadow-md transition-transform duration-150 ${
          active ? "scale-150" : ""
        }`}
        style={{ width: 18, height: 18, background: a.color }}
      />
    </div>
  );
}
