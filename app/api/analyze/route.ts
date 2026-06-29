import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Enforce the base64 data-URI contract (Cerebras accepts data URIs only).
const imageDataUri = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/, "Image must be a base64 data URI");

const requestSchema = z.object({
  goal: z.string().max(2000).optional(),
  presetId: z.string().max(64).optional(),
  images: z.array(imageDataUri).min(1).max(5),
  fast: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, {
    keyPrefix: "analyze",
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many analysis requests; please wait a minute and try again." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Guard against oversized payloads (Cerebras ~10MB/request).
  const totalBytes = parsed.data.images.reduce((a, s) => a + s.length, 0);
  if (totalBytes > 12_000_000) {
    return NextResponse.json(
      { error: "Images too large; please use smaller / fewer images." },
      { status: 413 },
    );
  }

  try {
    const result = await orchestrate(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/analyze] failed:", e);
    const message = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
