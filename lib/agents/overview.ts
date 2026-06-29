import "server-only";
import { chat, parseJson } from "@/lib/cerebras/client";
import { imageContent, textContent } from "@/lib/cerebras/content";
import { Metrics } from "@/lib/cerebras/metrics";
import { overviewSchema } from "@/schemas/overview";
import { overviewSystem, overviewUser } from "@/prompts/overview";
import type { Region, TaskProfile } from "@/schemas/annotation";

export interface OverviewOut {
  overallScore: number;
  summary: string[];
  tip: string;
}

/** Overview agent — whole-image summary + tip for the GoodPanel. */
export async function overview(
  profile: TaskProfile,
  goal: string,
  regions: Region[],
  image: string,
  metrics: Metrics,
): Promise<OverviewOut> {
  const r = await chat({
    messages: [
      { role: "system", content: overviewSystem(profile, goal) },
      { role: "user", content: [textContent(overviewUser(regions)), imageContent(image)] },
    ],
    reasoningEffort: "none",
    responseFormat: overviewSchema,
    maxTokens: 400,
  });
  metrics.record("overview", r, r.clientIndex);
  const parsed = parseJson<Partial<OverviewOut>>(r.content);
  return {
    overallScore: Number(parsed.overallScore) || 0,
    summary: Array.isArray(parsed.summary) ? parsed.summary.map(String).filter(Boolean) : [],
    tip: String(parsed.tip ?? ""),
  };
}
