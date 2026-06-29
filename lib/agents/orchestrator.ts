import "server-only";
import { clientCount } from "@/lib/cerebras/client";
import { fanout } from "@/lib/cerebras/fanout";
import { Metrics } from "@/lib/cerebras/metrics";
import { getPreset } from "@/prompts/presets";
import { plan } from "./planner";
import { ground } from "./grounding";
import { coachRegion, type CoachOut } from "./coach";
import { research } from "./research";
import { sequence } from "./sequencer";
import { overview } from "./overview";
import { scoreColor, neutralColor } from "@/lib/color";
import { centerOf } from "@/lib/scale";
import { round1, avg, errMsg } from "@/lib/util";
import { audit } from "@/lib/audit/log";
import type { ReasoningEffort } from "@/lib/env";

/** Only the most-relevant regions get a (slower, rate-limited) web search. */
const RESEARCH_TOP_K = 4;
import type {
  AnalyzeRequest,
  AnalyzeResult,
  Annotation,
  Citation,
  Region,
  TaskProfile,
} from "@/schemas/annotation";

function buildAnnotation(
  region: Region,
  coach: CoachOut | null,
  profile: TaskProfile,
  citations: Citation[],
): Annotation {
  const score = coach ? round1(coach.score) : 0;
  const render: "dot" | "region" = profile.renderStyle === "dots" ? "dot" : "region";
  const manualRef =
    coach && coach.manualRef.some((v) => v !== 0) ? coach.manualRef : null;
  return {
    id: region.id,
    label: region.label,
    box_2d: region.box_2d,
    point: centerOf(region.box_2d),
    render,
    score,
    scored: profile.scored,
    color: profile.scored ? scoreColor(score) : neutralColor(region.id),
    whatGood: coach?.whatGood ?? [],
    fix: coach?.fix ?? "",
    facts: coach?.facts ?? [],
    stepOrder: coach?.stepOrder ?? 0,
    stepAction: coach?.stepAction ?? "",
    manualRef,
    citations,
  };
}

/**
 * The multi-agent pipeline:
 *   Planner → Grounding → (Research → Coach) fanned out per region → Sequencer → Overview
 * Coordinated here; Cerebras speed is showcased by the parallel coach fan-out.
 */
export async function orchestrate(req: AnalyzeRequest): Promise<AnalyzeResult> {
  const start = Date.now();
  const metrics = new Metrics();
  const warnings: string[] = [];

  const images = req.images.slice(0, 5);
  if (images.length === 0) throw new Error("No image provided");
  const primary = images[0];

  // Live/webcam frames pass fast=true → drop reasoning everywhere for minimum
  // latency (the empirical test showed reasoning adds ~250 tok/call).
  const effort: ReasoningEffort = req.fast ? "none" : "low";

  // 1. Resolve the TaskProfile (preset bypasses the Planner for determinism).
  const preset = getPreset(req.presetId);
  let goal = req.goal?.trim() ?? "";
  let profile: TaskProfile;
  if (preset) {
    profile = preset.profile;
    if (!goal) goal = preset.goal;
  } else {
    try {
      profile = await plan(goal, primary, metrics, effort);
    } catch (e) {
      warnings.push("Planner failed, using default profile: " + errMsg(e));
      profile = {
        title: goal || "Visual guide",
        targetDescription: goal
          ? `the things relevant to: ${goal}`
          : "the main objects of interest in the image",
        renderStyle: "dots",
        scored: false,
        scoreLabel: "",
        sequence: false,
        research: false,
        summaryLabel: "Key observations",
      };
    }
  }

  // 2. Vision grounding (one call, all images so the manual can be referenced).
  let regions: Region[] = [];
  try {
    regions = await ground(profile, images, metrics, effort);
  } catch (e) {
    warnings.push("Grounding failed: " + errMsg(e));
  }

  // 3. Per-region fan-out (Research → Coach) AND the whole-image Overview run
  // concurrently — Overview only needs regions + image, so there's no reason to
  // wait for the fan-out. Each coach call round-robins across the key pool.
  const fanoutPromise = fanout(
    regions,
    async (region, clientIndex, index): Promise<Annotation> => {
      let researchContext: string | undefined;
      let citations: Citation[] = [];
      // Only the top-K most-relevant regions get a web search (rate/cost).
      if (profile.research && index < RESEARCH_TOP_K) {
        try {
          const rr = await research(region, goal, profile);
          if (rr) {
            researchContext = rr.context;
            citations = rr.citations;
          }
        } catch (e) {
          warnings.push(`Research failed for "${region.label}": ${errMsg(e)}`);
        }
      }
      try {
        const coach = await coachRegion(
          region,
          profile,
          goal,
          images,
          researchContext,
          clientIndex,
          metrics,
          effort,
        );
        return buildAnnotation(region, coach, profile, citations);
      } catch (e) {
        warnings.push(`Coaching failed for "${region.label}": ${errMsg(e)}`);
        return buildAnnotation(region, null, profile, citations);
      }
    },
  );

  const overviewPromise = overview(profile, goal, regions, primary, metrics, effort)
    .then((ov) => ({ ov }) as const)
    .catch((e) => ({ err: e }) as const);

  const [built, ovSettled] = await Promise.all([fanoutPromise, overviewPromise]);

  let annotations = built;
  if (profile.sequence) annotations = sequence(annotations);

  // 4. Resolve the overview (or fall back to the average coach score).
  let overallScore: number | null = null;
  let summary: string[] = [];
  let tip = "";
  if ("ov" in ovSettled) {
    overallScore = profile.scored ? round1(ovSettled.ov.overallScore) : null;
    summary = ovSettled.ov.summary;
    tip = ovSettled.ov.tip;
  } else {
    warnings.push("Overview failed: " + errMsg(ovSettled.err));
    if (profile.scored && annotations.length > 0) {
      overallScore = round1(avg(annotations.map((a) => a.score)));
    }
  }

  const speed = metrics.build(Date.now() - start, clientCount());
  audit({ mode: profile.title, presetId: req.presetId, regionCount: regions.length, speed });

  return {
    profile,
    annotations,
    overallScore,
    summary,
    tip,
    speed,
    warnings: warnings.length ? warnings : undefined,
  };
}
