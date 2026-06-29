"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";

/** Streaming follow-up chat about the current analysis (shows Cerebras speed live). */
export function AskBox({ context, image }: { context: string; image?: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask() {
    const q = question.trim();
    if (!q || streaming) return;
    setStreaming(true);
    setAnswer("");
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context, image }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.cancel().catch(() => {});
      }
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      setAnswer((prev) => prev + (aborted ? "\n[stopped]" : "\n[request failed — try again]"));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask a follow-up</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="e.g. why is that the fix?"
          />
          <Button onClick={ask} disabled={streaming || !question.trim()}>
            {streaming ? "…" : "Ask"}
          </Button>
        </div>
        {answer && (
          <div className="mt-3 rounded-lg bg-muted p-3">
            <Markdown>{answer}</Markdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
