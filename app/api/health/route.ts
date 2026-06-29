import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { chat, clientCount } from "@/lib/cerebras/client";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Valid 192x192 test pattern (committed in public/) to probe image passthrough.
function testImage(): string {
  const buf = readFileSync(join(process.cwd(), "public", "test-pattern.png"));
  return "data:image/png;base64," + buf.toString("base64");
}

/**
 * Phase-0 de-risk probe.
 *  - GET /api/health         → cheap: just reports keysConfigured (no model call).
 *  - GET /api/health?live=1  → also fires real text + image probes against Cerebras.
 * The live probes are gated so casual/bot hits don't burn paid API quota; raw
 * provider error text is logged server-side, not returned to the client.
 */
export async function GET(req: NextRequest) {
  const out: Record<string, unknown> = { keysConfigured: clientCount() };
  const live = req.nextUrl.searchParams.get("live") === "1";
  if (!live) {
    out.hint = "append ?live=1 to run live Cerebras text + image probes";
    return NextResponse.json(out);
  }

  const limited = rateLimit(req, {
    keyPrefix: "health-live",
    limit: 6,
    windowMs: 10 * 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many live health checks; please wait before trying again." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    const r = await chat({
      messages: [{ role: "user", content: 'Reply with exactly the word "ok".' }],
      maxTokens: 10,
    });
    out.textOk = /ok/i.test(r.content);
    out.textSample = r.content;
    out.textTimeInfo = r.timeInfo;
  } catch (e) {
    console.error("[/api/health] text probe failed:", e);
    out.textOk = false;
  }

  try {
    const r = await chat({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "List the colors in this image. Briefly." },
            { type: "image_url", image_url: { url: testImage() } },
          ],
        },
      ],
      maxTokens: 40,
    });
    out.imageOk = true;
    out.imageSample = r.content;
    out.imageTimeInfo = r.timeInfo;
  } catch (e) {
    console.error("[/api/health] image probe failed:", e);
    out.imageOk = false;
  }

  return NextResponse.json(out);
}
