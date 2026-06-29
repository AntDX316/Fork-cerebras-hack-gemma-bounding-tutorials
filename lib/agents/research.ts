import "server-only";
import { exaSearch, type ResearchResult } from "@/lib/exa/client";
import type { Region, TaskProfile } from "@/schemas/annotation";

/**
 * Research agent — Exa web search for how-to RESOURCES on a specific item.
 * The query leads with the concrete item (region label) followed by the user's
 * goal (the real intent — "how to use this machine", "is this healthy"), so Exa
 * returns guides/tutorials about THAT thing rather than generic pages. Tokens are
 * de-duplicated so it reads like a real search, not a concatenated blob.
 */
export async function research(
  region: Region,
  goal: string,
  profile: TaskProfile,
): Promise<ResearchResult | undefined> {
  const intent = (goal || profile.title).toLowerCase();
  const seen = new Set<string>();
  const query = `${region.label} ${intent}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !seen.has(w) && (seen.add(w), true))
    .slice(0, 14)
    .join(" ")
    .trim()
    .slice(0, 200);
  if (!query) return undefined;
  return exaSearch(query, 3);
}
