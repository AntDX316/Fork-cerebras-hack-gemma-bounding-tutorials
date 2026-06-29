import type { ChatResult } from "./client";
import type { SpeedReport } from "@/schemas/annotation";

interface Rec {
  agent: string;
  usage: ChatResult["usage"];
  timeInfo: ChatResult["timeInfo"];
  clientIndex: number;
}

/** Accumulates per-call Cerebras timing/usage to build the SpeedReport HUD. */
export class Metrics {
  private recs: Rec[] = [];

  record(agent: string, r: ChatResult, clientIndex: number): void {
    this.recs.push({ agent, usage: r.usage, timeInfo: r.timeInfo, clientIndex });
  }

  build(wallClockMs: number, keyCount: number): SpeedReport {
    const sum = (f: (r: Rec) => number) => this.recs.reduce((a, r) => a + f(r), 0);
    const completionTokens = sum((r) => r.usage.completion_tokens ?? 0);
    const promptTokens = sum((r) => r.usage.prompt_tokens ?? 0);
    const totalTokens = sum((r) => r.usage.total_tokens ?? 0);
    const usedKeys = new Set(this.recs.map((r) => r.clientIndex)).size;
    const tps = wallClockMs > 0 ? completionTokens / (wallClockMs / 1000) : 0;

    // TTFT proxy: the fastest "time before generation" (queue + prompt) across
    // calls — i.e. how quickly Cerebras starts producing tokens.
    const ttftCandidates = this.recs
      .map((r) => ((r.timeInfo.queue_time ?? 0) + (r.timeInfo.prompt_time ?? 0)) * 1000)
      .filter((ms) => ms > 0);
    const ttftMs = ttftCandidates.length ? Math.min(...ttftCandidates) : 0;

    return {
      totalTokens,
      promptTokens,
      completionTokens,
      tokensPerSecond: Math.round(tps),
      ttftMs: Math.round(ttftMs),
      wallClockMs: Math.round(wallClockMs),
      parallelCalls: this.recs.length,
      keysUsed: Math.max(1, usedKeys || keyCount),
      perCall: this.recs.map((r) => ({
        agent: r.agent,
        totalTimeMs: Math.round((r.timeInfo.total_time ?? 0) * 1000),
        totalTokens: r.usage.total_tokens ?? 0,
      })),
    };
  }
}
