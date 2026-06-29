import "server-only";
import { exaSearch, type ResearchResult } from "@/lib/exa/client";
import type { Region, TaskProfile } from "@/schemas/annotation";

/** Research agent — Exa web search to enrich a region with external facts. */
export async function research(
  region: Region,
  goal: string,
  profile: TaskProfile,
): Promise<ResearchResult | undefined> {
  const query = `${region.label} ${profile.title} ${goal}`.trim().slice(0, 200);
  return exaSearch(query, 3);
}
