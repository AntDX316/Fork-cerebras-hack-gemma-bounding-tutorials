"use client";

import type { SpeedReport } from "@/schemas/annotation";
import { Card, CardContent } from "@/components/ui/card";

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

export function SpeedHud({ speed, model }: { speed: SpeedReport; model: string }) {
  // Headline the peak single-call rate (true Cerebras throughput); fall back to
  // the aggregate if per-call timing wasn't available.
  const headline = speed.peakTokensPerSecond || speed.tokensPerSecond;
  return (
    <Card className="border-transparent bg-slate-900 text-white ring-slate-800">
      <CardContent>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          <span aria-hidden>⚡</span> Cerebras speed
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat big value={headline.toLocaleString()} unit="peak tokens / sec" />
          <Stat value={`${speed.wallClockMs}ms`} unit="end-to-end" />
          <Stat value={speed.modelCalls} unit="Cerebras calls" />
          <Stat value={speed.keysUsed} unit={speed.keysUsed === 1 ? "API key" : "API keys"} />
        </div>
        <div className="mt-3 text-[10px] text-slate-400">
          {model} · {speed.totalTokens.toLocaleString()} tokens · {speed.tokensPerSecond.toLocaleString()}{" "}
          tok/s aggregate · TTFT {speed.ttftMs}ms
        </div>
      </CardContent>
    </Card>
  );
}
