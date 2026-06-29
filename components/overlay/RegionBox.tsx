"use client";

import { motion } from "framer-motion";
import type { Annotation } from "@/schemas/annotation";
import { pctBox } from "@/lib/scale";
import { ScoreBadge } from "./ScoreBadge";

export function RegionBox({
  a,
  active,
  dimmed,
  ariaLabel,
  onEnter,
  onLeave,
}: {
  a: Annotation;
  active: boolean;
  dimmed: boolean;
  ariaLabel: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const r = pctBox(a.box_2d);
  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      initial={false}
      animate={{ opacity: dimmed ? 0.18 : 1, scale: active ? 1.02 : 1 }}
      transition={{ duration: 0.25 }}
      className="absolute rounded-lg border-2 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      style={{
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        borderColor: a.color,
        background: `${a.color}14`,
        boxShadow: active
          ? `0 0 0 3px ${a.color}55, 0 0 22px ${a.color}99`
          : `0 0 0 1px ${a.color}33`,
        zIndex: active ? 20 : 10,
      }}
    >
      {a.stepOrder > 0 && (
        <div
          className="absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow"
          style={{ background: a.color }}
        >
          {a.stepOrder}
        </div>
      )}
      {a.scored && (
        <div className="absolute -right-2 -top-3">
          <ScoreBadge score={a.score} color={a.color} />
        </div>
      )}
    </motion.div>
  );
}
