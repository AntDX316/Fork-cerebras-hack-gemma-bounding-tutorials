import "server-only";
import { chat, parseJson } from "@/lib/cerebras/client";
import { imageContent, textContent } from "@/lib/cerebras/content";
import { Metrics } from "@/lib/cerebras/metrics";
import { coachSchema } from "@/schemas/coach";
import { coachSystem, coachUser } from "@/prompts/coach";
import type { ReasoningEffort } from "@/lib/env";
import type { Box2D, Fact, Region, TaskProfile } from "@/schemas/annotation";

export interface CoachOut {
  score: number;
  whatGood: string[];
  fix: string;
  facts: Fact[];
  stepOrder: number;
  stepAction: string;
  manualRef: Box2D;
}

function coerce(raw: Partial<CoachOut>): CoachOut {
  const facts = Array.isArray(raw.facts)
    ? raw.facts
        .filter((f): f is Fact => !!f && typeof f === "object")
        .map((f) => ({ label: String(f.label ?? ""), value: String(f.value ?? "") }))
        .filter((f) => f.label || f.value)
    : [];
  const mr = Array.isArray(raw.manualRef) ? raw.manualRef.map((v) => Math.round(Number(v)) || 0) : [];
  return {
    score: Number(raw.score) || 0,
    whatGood: Array.isArray(raw.whatGood) ? raw.whatGood.map(String).filter(Boolean) : [],
    fix: String(raw.fix ?? ""),
    facts,
    stepOrder: Math.max(0, Math.round(Number(raw.stepOrder) || 0)),
    stepAction: String(raw.stepAction ?? ""),
    manualRef: [mr[0] ?? 0, mr[1] ?? 0, mr[2] ?? 0, mr[3] ?? 0],
  };
}

/** Domain-Coach agent — one Gemma call per region (run in parallel via fanout). */
export async function coachRegion(
  region: Region,
  profile: TaskProfile,
  goal: string,
  images: string[],
  researchContext: string | undefined,
  clientIndex: number,
  metrics: Metrics,
  effort: ReasoningEffort = "low",
): Promise<CoachOut> {
  const r = await chat({
    messages: [
      { role: "system", content: coachSystem(profile, goal) },
      {
        role: "user",
        content: [textContent(coachUser(region, researchContext)), ...images.map(imageContent)],
      },
    ],
    // BRAIN: light reasoning improves the per-region scoring + advice.
    // Budget covers reasoning tokens + the JSON, or content truncates.
    // (Live/webcam frames pass "none" for minimum latency.)
    reasoningEffort: effort,
    responseFormat: coachSchema,
    maxTokens: 1600,
    temperature: 0.2,
    clientIndex,
  });
  metrics.record(`coach:${region.id}`, r, r.clientIndex);
  return coerce(parseJson<Partial<CoachOut>>(r.content));
}
