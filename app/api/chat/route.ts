import { NextRequest } from "next/server";
import { z } from "zod";
import { chatStream } from "@/lib/cerebras/client";
import { imageContent, textContent } from "@/lib/cerebras/content";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(8000).optional(),
  image: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/)
    .max(12_000_000)
    .optional(),
});

/**
 * Streaming follow-up chat: "ask a question about what you found".
 * Streams plain-text tokens so the UI shows Cerebras speed live.
 */
export async function POST(req: NextRequest) {
  // Public surface (the shared /s page exposes this) — cap per-IP usage so an
  // anonymous visitor can't burn Cerebras quota.
  const limited = rateLimit(req, { keyPrefix: "chat", limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return new Response("Too many requests; please wait a moment.", {
      status: 429,
      headers: rateLimitHeaders(limited),
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return new Response("Invalid request", { status: 400 });
  const { question, context, image } = parsed.data;

  const system = `You are a concise visual coach. Answer the user's follow-up question about the analysis. Be specific and practical.${
    context ? `\n\nAnalysis context:\n${context}` : ""
  }`;
  const userContent = image
    ? [textContent(question), imageContent(image)]
    : [textContent(question)];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const token of chatStream({
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          reasoningEffort: "low",
          maxTokens: 1024,
        })) {
          controller.enqueue(encoder.encode(token));
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode("\n\n[error: " + (e instanceof Error ? e.message : "stream failed") + "]"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
