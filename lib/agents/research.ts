import "server-only";
import { exaSearch, type ResearchResult } from "@/lib/exa/client";
import type { Region, TaskProfile } from "@/schemas/annotation";

/**
 * Research agent — Exa web search to enrich a region with external facts.
 * The query leads with the concrete item (region label) and adds an intent hint
 * from the score label / goal, de-duplicating tokens so it reads like a real
 * search rather than a concatenated blob.
 */
export async function research(
  region: Region,
  goal: string,
  profile: TaskProfile,
): Promise<ResearchResult | undefined> {
  const intent = (profile.scoreLabel || goal || profile.title).toLowerCase();
  const seen = new Set<string>();
  const query = `${region.label} ${intent}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !seen.has(w) && (seen.add(w), true))
    .slice(0, 12)
    .join(" ")
    .trim()
    .slice(0, 200);
  if (!query) return undefined;
  return exaSearch(query, 3);
}
