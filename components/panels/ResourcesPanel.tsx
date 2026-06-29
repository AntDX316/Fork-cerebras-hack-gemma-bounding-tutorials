"use client";

import type { AnalyzeResult } from "@/schemas/annotation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Surfaces the Research agent's web findings as clickable how-to resources,
 * grouped by the item they belong to (e.g. links for each gym machine).
 */
export function ResourcesPanel({ result }: { result: AnalyzeResult }) {
  const items = result.annotations.filter((a) => a.citations.length > 0);
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <span aria-hidden>🔎</span> Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((a) => (
          <div key={a.id}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: a.color }}
                aria-hidden
              />
              {a.label}
            </div>
            <ul className="mt-1 space-y-1.5">
              {a.citations.slice(0, 3).map((c, i) => (
                <li key={i} className="leading-snug">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {(c.title || c.url).slice(0, 80)}
                  </a>
                  {c.snippet && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.snippet}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="pt-1 text-[10px] text-muted-foreground">
          Found by the Research agent (Exa web search).
        </p>
      </CardContent>
    </Card>
  );
}
