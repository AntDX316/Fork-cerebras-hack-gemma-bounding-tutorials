import "server-only";
import Exa from "exa-js";
import { env } from "@/lib/env";

export interface ResearchResult {
  context: string;
  citations: { title: string; url: string; snippet?: string }[];
}

let exa: Exa | null = null;
function getExa(): Exa | null {
  if (exa) return exa;
  if (!env.exaApiKey) return null;
  exa = new Exa(env.exaApiKey);
  return exa;
}

/** Web search + content for the Research agent. Returns undefined on any failure. */
export async function exaSearch(query: string, numResults = 3): Promise<ResearchResult | undefined> {
  const client = getExa();
  if (!client) return undefined;
  try {
    const search = client.searchAndContents as unknown as (
      q: string,
      opts: Record<string, unknown>,
    ) => Promise<{ results?: Array<Record<string, unknown>> }>;
    const res = await search(query, {
      numResults,
      text: { maxCharacters: 600 },
      summary: true,
    });
    const results = res?.results ?? [];
    if (results.length === 0) return undefined;

    const citations = results.map((r) => ({
      title: String(r.title ?? r.url ?? "source"),
      url: String(r.url ?? ""),
      snippet: typeof r.summary === "string" ? r.summary : textSnippet(r.text),
    }));
    const context = results
      .map((r, i) => `[${i + 1}] ${String(r.title ?? "")}: ${summaryOrText(r)}`)
      .join("\n");
    return { context, citations };
  } catch {
    return undefined;
  }
}

function textSnippet(text: unknown): string | undefined {
  return typeof text === "string" ? text.slice(0, 200) : undefined;
}

function summaryOrText(r: Record<string, unknown>): string {
  if (typeof r.summary === "string") return r.summary;
  if (typeof r.text === "string") return r.text.slice(0, 400);
  return "";
}
