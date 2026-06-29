"use client";

import type { AnalyzeResult } from "@/schemas/annotation";
import { scoreColor } from "@/lib/color";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  const pct = Math.max(0, Math.min(10, score)) / 10;
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} ${pct * 360}deg, var(--muted) 0deg)` }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-sm font-bold text-foreground">
          {score.toFixed(1)}
        </div>
      </div>
      {label && (
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

export function GoodPanel({ result }: { result: AnalyzeResult }) {
  const { profile, summary, tip, overallScore } = result;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle>{profile.summaryLabel}</CardTitle>
        {overallScore != null && <ScoreRing score={overallScore} label={profile.scoreLabel} />}
      </CardHeader>
      <CardContent>
        {summary.length > 0 ? (
          <ul className="space-y-2">
            {summary.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/80">
                <span className="mt-0.5 text-emerald-500" aria-hidden>
                  ✓
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No summary returned.</p>
        )}

        {tip && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <span className="font-semibold">Tip: </span>
            {tip}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
