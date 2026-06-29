"use client";

import type { AnalyzeResult } from "@/schemas/annotation";
import { Card, CardContent } from "@/components/ui/card";

const PHASE_LABEL: Record<string, string> = {
  planner: "Plan",
  grounding: "Locate",
  coach: "Coach",
  overview: "Summarize",
};
const PHASE_ORDER = ["planner", "grounding", "coach", "overview"];

function Stat({ value, unit, big }: { value: string | number; unit: string; big?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 p-2.5">
      <div className={`font-bold leading-none text-amber-300 ${big ? "text-2xl" : "text-lg"}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{unit}</div>
    </div>
  );
}

function Bar({
  label,
  ms,
  maxMs,
  tone,
}: {
  label: string;
  ms: number;
  maxMs: number;
  tone: "fast" | "slow";
}) {
  const pct = Math.max(3, Math.round((ms / maxMs) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300">{label}</span>
        <span className="tabular-nums font-semibold text-white">{(ms / 1000).toFixed(2)}s</span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${tone === "fast" ? "bg-amber-400" : "bg-slate-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Cerebras speed story: headline peak throughput, then a "pipeline race" — the
 * measured parallel wall clock vs the (honest) estimate of running every model
 * call one-by-one — plus a per-phase breakdown and a plain-language recap. This
 * is what makes the multi-agent + Cerebras advantage legible to judges.
 */
export function SpeedHud({ result, model }: { result: AnalyzeResult; model: string }) {
  const speed = result.speed;
  const headline = speed.peakTokensPerSecond || speed.tokensPerSecond;

  const serialMs = speed.perCall.reduce((a, c) => a + c.totalTimeMs, 0);
  const actualMs = speed.wallClockMs;
  // Only show the race when sequential execution would have been meaningfully
  // slower (i.e. the fan-out actually overlapped enough work to be worth it).
  const showRace = serialMs > actualMs * 1.2;
  const speedup = actualMs > 0 ? serialMs / actualMs : 1;
  const maxMs = Math.max(serialMs, actualMs, 1);

  const byPhase = new Map<string, { count: number; ms: number }>();
  for (const c of speed.perCall) {
    const p = c.agent.split(":")[0];
    const e = byPhase.get(p) ?? { count: 0, ms: 0 };
    e.count += 1;
    e.ms += c.totalTimeMs;
    byPhase.set(p, e);
  }
  const coachCalls = byPhase.get("coach")?.count ?? 0;
  const items = result.annotations.length;
  const sources = result.annotations.reduce((a, x) => a + x.citations.length, 0);

  return (
    <Card className="border-transparent bg-slate-900 text-white ring-slate-800">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
            <span aria-hidden>⚡</span> Cerebras speed
          </div>
          {showRace && speedup >= 1.3 && (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">
              {speedup.toFixed(1)}× faster
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat big value={headline.toLocaleString()} unit="peak tokens / sec" />
          <Stat value={`${actualMs}ms`} unit="end-to-end" />
          <Stat value={speed.modelCalls} unit="Cerebras calls" />
          <Stat value={speed.keysUsed} unit={speed.keysUsed === 1 ? "API key" : "API keys"} />
        </div>

        {showRace && (
          <div className="mt-4 space-y-2.5">
            <Bar
              label={`Actual · ${speed.modelCalls} calls in parallel`}
              ms={actualMs}
              maxMs={maxMs}
              tone="fast"
            />
            <Bar label="Total model time (if sequential)" ms={serialMs} maxMs={maxMs} tone="slow" />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PHASE_ORDER.filter((p) => byPhase.has(p)).map((p) => {
            const e = byPhase.get(p)!;
            const parallel = p === "coach" && e.count > 1;
            return (
              <span key={p} className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                {PHASE_LABEL[p] ?? p}
                {parallel ? ` ×${e.count} ∥` : ""} · {(e.ms / 1000).toFixed(2)}s
              </span>
            );
          })}
        </div>

        {items > 0 && (
          <div className="mt-3 text-[11px] leading-snug text-slate-300">
            Gemma located <b className="text-white">{items}</b> item{items === 1 ? "" : "s"}
            {coachCalls > 1 ? (
              <>
                , coached <b className="text-white">{coachCalls}</b> in parallel
              </>
            ) : null}
            {sources > 0 ? (
              <>
                , used <b className="text-white">{sources}</b> web source{sources === 1 ? "" : "s"}
              </>
            ) : null}{" "}
            in <b className="text-white">{(actualMs / 1000).toFixed(1)}s</b>.
          </div>
        )}

        <div className="mt-2 text-[10px] text-slate-400">
          {model} · {speed.totalTokens.toLocaleString()} tokens ·{" "}
          {speed.tokensPerSecond.toLocaleString()} tok/s aggregate · TTFT {speed.ttftMs}ms
        </div>
      </CardContent>
    </Card>
  );
}
