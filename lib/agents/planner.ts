import "server-only";
import { chat, parseJson } from "@/lib/cerebras/client";
import { imageContent, textContent } from "@/lib/cerebras/content";
import { Metrics } from "@/lib/cerebras/metrics";
import { taskProfileSchema } from "@/schemas/taskProfile";
import { PLANNER_SYSTEM, plannerUser } from "@/prompts/planner";
import type { ReasoningEffort } from "@/lib/env";
import type { RenderStyle, TaskProfile } from "@/schemas/annotation";

const RENDER_STYLES: RenderStyle[] = ["dots", "regions", "steps"];

function normalizeProfile(p: Partial<TaskProfile>): TaskProfile {
  const renderStyle = RENDER_STYLES.includes(p.renderStyle as RenderStyle)
    ? (p.renderStyle as RenderStyle)
    : "dots";
  const sequence = Boolean(p.sequence) || renderStyle === "steps";
  const scored = Boolean(p.scored);
  return {
    title: p.title?.trim() || "Visual guide",
    targetDescription: p.targetDescription?.trim() || "the main objects of interest in the image",
    renderStyle,
    scored,
    scoreLabel: scored ? p.scoreLabel?.trim() || "Score" : "",
    sequence,
    research: Boolean(p.research),
    summaryLabel: p.summaryLabel?.trim() || "What looks good",
  };
}

/** Infer a TaskProfile from any goal + image (this is what enables unlimited modes). */
export async function plan(
  goal: string | undefined,
  image: string,
  metrics: Metrics,
  effort: ReasoningEffort = "low",
): Promise<TaskProfile> {
  const r = await chat({
    messages: [
      { role: "system", content: PLANNER_SYSTEM },
      { role: "user", content: [textContent(plannerUser(goal ?? "")), imageContent(image)] },
    ],
    // BRAIN: light reasoning improves how it designs the coaching profile.
    // Budget must cover reasoning tokens + the JSON, or content truncates.
    // (Live/webcam frames pass "none" for minimum latency.)
    reasoningEffort: effort,
    responseFormat: taskProfileSchema,
    maxTokens: 1400,
  });
  metrics.record("planner", r, r.clientIndex);
  return normalizeProfile(parseJson<Partial<TaskProfile>>(r.content));
}
