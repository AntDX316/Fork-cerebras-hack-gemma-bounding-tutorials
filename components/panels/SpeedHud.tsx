"use client";

import type { SpeedReport } from "@/schemas/annotation";
import { Card, CardContent } from "@/components/ui/card";

function Stat({ value, unit, big }: { value: string | number; unit: string; big?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 p-2.5">
      <div className={`font-bold leading-none text-cyan-300 ${big ? "text-2xl" : "text-lg"}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{unit}</div>
    </div>
  );
}

export function SpeedHud({ speed, model }: { speed: SpeedReport; model: string }) {
  return (
    <Card className="border-transparent bg-slate-900 text-white ring-slate-800">
      <CardContent>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-300">
          <span aria-hidden>⚡</span> Cerebras speed
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat big value={speed.tokensPerSecond.toLocaleString()} unit="tokens / sec" />
          <Stat value={`${speed.wallClockMs}ms`} unit="wall clock" />
          <Stat value={speed.parallelCalls} unit="parallel calls" />
          <Stat value={speed.keysUsed} unit="API keys" />
        </div>
        <div className="mt-3 text-[10px] text-slate-400">
          {model} · {speed.totalTokens.toLocaleString()} tokens · TTFT {speed.ttftMs}ms
        </div>
      </CardContent>
    </Card>
  );
}
