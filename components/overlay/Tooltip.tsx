"use client";

import type { CSSProperties } from "react";
import type { Annotation, TaskProfile } from "@/schemas/annotation";

export function Tooltip({
  a,
  profile,
  style,
  showResources = true,
  onMouseEnter,
  onMouseLeave,
}: {
  a: Annotation;
  profile: TaskProfile;
  style: CSSProperties;
  showResources?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute z-30 w-64 overflow-y-auto rounded-xl bg-slate-900/95 p-3 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
      style={style}
    >
      <div className="font-semibold">
        {a.label}
        {a.scored && (
          <span className="ml-2 text-xs font-normal text-slate-300">
            {profile.scoreLabel}: {a.score.toFixed(1)}/10
          </span>
        )}
      </div>

      {a.stepAction && (
        <div className="mt-1 font-medium text-amber-300">
          Step {a.stepOrder}: {a.stepAction}
        </div>
      )}

      {a.whatGood.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {a.whatGood.map((g, i) => (
            <li key={i} className="flex gap-1 text-xs text-emerald-300">
              <span aria-hidden>✓</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      )}

      {a.fix && (
        <div className="mt-2 text-xs text-slate-100">
          <span className="font-semibold text-amber-400">Fix: </span>
          {a.fix}
        </div>
      )}

      {a.facts.length > 0 && (
        <div className="mt-2 text-xs text-slate-300">
          {a.facts.map((f) => `${f.label} ${f.value}`).join(" · ")}
        </div>
      )}

      {showResources && a.citations.length > 0 && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            Resources
          </div>
          <ul className="pointer-events-auto space-y-1">
            {a.citations.slice(0, 3).map((c, i) => (
              <li key={i}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-300 underline underline-offset-2 opacity-90 hover:opacity-100"
                >
                  {(c.title || c.url || "source").slice(0, 46)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
