import "server-only";
import { chat, parseJson } from "@/lib/cerebras/client";
import { imageContent, textContent } from "@/lib/cerebras/content";
import { Metrics } from "@/lib/cerebras/metrics";
import { groundingSchema } from "@/schemas/grounding";
import { groundingSystem, GROUNDING_USER } from "@/prompts/grounding";
import type { ReasoningEffort } from "@/lib/env";
import type { Box2D, Region, TaskProfile } from "@/schemas/annotation";

function toBox(arr: unknown): Box2D {
  const a = Array.isArray(arr) ? arr : [];
  const n = (v: unknown) => {
    const x = Math.round(Number(v));
    return Number.isFinite(x) ? Math.max(0, Math.min(1000, x)) : 0;
  };
  return [n(a[0]), n(a[1]), n(a[2]), n(a[3])];
}

/** Vision-Grounding agent — one Gemma call locating up to 8 targets. */
export async function ground(
  profile: TaskProfile,
  images: string[],
  metrics: Metrics,
  effort: ReasoningEffort = "low",
): Promise<Region[]> {
  const r = await chat({
    messages: [
      { role: "system", content: groundingSystem(profile) },
      { role: "user", content: [textContent(GROUNDING_USER), ...images.map(imageContent)] },
    ],
    // EYES: light reasoning helps it choose the most relevant targets.
    // Budget covers reasoning + the regions JSON (temp 0 keeps boxes stable).
    // (Live/webcam frames pass "none" for minimum latency.)
    reasoningEffort: effort,
    responseFormat: groundingSchema,
    maxTokens: 2200,
    temperature: 0, // deterministic, stable coordinates
  });
  metrics.record("grounding", r, r.clientIndex);

  const parsed = parseJson<{ regions?: Array<Record<string, unknown>> }>(r.content);
  const regions = parsed.regions ?? [];
  return regions.slice(0, 8).map((reg, i) => ({
    id: String(reg.id ?? `item-${i + 1}`),
    label: String(reg.label ?? `Item ${i + 1}`),
    box_2d: toBox(reg.box_2d),
  }));
}
