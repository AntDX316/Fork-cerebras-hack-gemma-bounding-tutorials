"use client";

import { useEffect, useRef } from "react";
import type { Annotation } from "@/schemas/annotation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function StepTimeline({
  steps,
  active,
  onChange,
  playing,
  onPlayingChange,
}: {
  steps: Annotation[];
  active: number;
  onChange: (n: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
}) {
  // Mirror `active` into a ref so the interval is created once per play session
  // (not torn down and recreated on every tick).
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const cur = activeRef.current;
      onChange(cur >= steps.length ? 1 : cur + 1);
    }, 1800);
    return () => clearInterval(id);
  }, [playing, steps.length, onChange]);

  if (steps.length === 0) return null;
  const current = steps.find((s) => s.stepOrder === active);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(Math.max(1, active - 1))}
            aria-label="Previous step"
          >
            ‹
          </Button>
          <Button size="sm" onClick={() => onPlayingChange(!playing)}>
            {playing ? "❚❚ Pause" : "▶ Play"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(Math.min(steps.length, active + 1))}
            aria-label="Next step"
          >
            ›
          </Button>
          <div className="ml-2 text-sm font-medium text-muted-foreground">
            Step {active} / {steps.length}
          </div>
        </div>

        <div className="mt-3 flex gap-1.5">
          {steps.map((s) => (
            <button
              key={s.id}
              onClick={() => onChange(s.stepOrder)}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: s.stepOrder === active ? s.color : "var(--muted)" }}
              aria-label={`Go to step ${s.stepOrder}`}
            />
          ))}
        </div>

        {current && (
          <div className="mt-3 text-sm">
            <span className="font-semibold text-foreground">{current.label}</span>
            {current.stepAction && <span className="text-foreground/70"> — {current.stepAction}</span>}
            {current.fix && <div className="mt-1 text-xs text-muted-foreground">{current.fix}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
