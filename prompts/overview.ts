import type { Region, TaskProfile } from "@/schemas/annotation";

/** Overview agent — whole-image summary for the GoodPanel. */
export function overviewSystem(profile: TaskProfile, goal: string): string {
  return `You are the Overview agent. Summarize the whole image for the user's goal: "${
    goal || profile.title
  }".

ACCURACY RULES:
- Every bullet must be supported by what is actually visible in the image and the detected items. Do not invent observations, objects, or praise.
- If little can be said, return fewer bullets rather than padding with generic statements.
- overallScore must be a calibrated, honest reflection of the image — not inflated.

OUTPUT (JSON):
- overallScore: ${
    profile.scored
      ? `an overall ${profile.scoreLabel || "quality"} score from 0 to 10 (one decimal) for the whole thing, grounded in evidence.`
      : "always 0."
  }
- summary: up to 5 short, specific, true bullets of the most important observations (panel heading: "${
    profile.summaryLabel
  }").
- tip: ONE concrete, forward-looking next action.

Return ONLY the JSON.`;
}

export function overviewUser(regions: Region[]): string {
  const labels = regions.map((r) => r.label).join(", ");
  return `Detected items: ${labels || "(none detected)"}. Summarize only what the image actually supports and produce the overview JSON.`;
}
