import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import type { ShareManifest } from "@/schemas/share";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

function decodeDataUri(uri: unknown): { buf: Buffer; ext: string; contentType: string } | null {
  if (typeof uri !== "string") return null;
  const m = /^data:(image\/(png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(uri);
  if (!m) return null;
  return {
    buf: Buffer.from(m[3], "base64"),
    ext: m[2] === "jpeg" ? "jpg" : m[2],
    contentType: m[1],
  };
}

/**
 * Opt-in share: persists the analysis so the /s page can re-render the FULL
 * INTERACTIVE experience (hover overlays, step timeline, follow-up chat) — not
 * just a flat PNG. We upload the clean scene image (+ optional manual + a baked
 * report-card PNG for social unfurl) and a manifest JSON, then return a
 * /s?d=<manifestUrl> link. Requires a Vercel Blob store (BLOB_READ_WRITE_TOKEN).
 * Degrades gracefully: returns 501 when not configured so the client falls back
 * to a local download.
 */
export async function POST(req: NextRequest) {
  // Public surface — cap per-IP uploads so shared links can't be abused.
  const limited = rateLimit(req, { keyPrefix: "share", limit: 12, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many share requests; please wait a moment." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Sharing not configured (add a Vercel Blob store)" },
      { status: 501 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(body.title ?? "Visual Coach result").slice(0, 140);
  const image = decodeDataUri(body.image);
  if (!image) {
    return NextResponse.json({ error: "Missing or invalid image" }, { status: 400 });
  }
  if (!body.result || typeof body.result !== "object") {
    return NextResponse.json({ error: "Missing analysis result" }, { status: 400 });
  }
  const manual = decodeDataUri(body.manual);
  const og = decodeDataUri(body.og);

  const total = image.buf.length + (manual?.buf.length ?? 0) + (og?.buf.length ?? 0);
  if (total > 16_000_000) {
    return NextResponse.json({ error: "Share payload too large" }, { status: 413 });
  }

  try {
    const id = crypto.randomUUID();
    const imageBlob = await put(`shares/${id}/scene.${image.ext}`, image.buf, {
      access: "public",
      contentType: image.contentType,
    });
    const manualBlob = manual
      ? await put(`shares/${id}/manual.${manual.ext}`, manual.buf, {
          access: "public",
          contentType: manual.contentType,
        })
      : null;
    const ogBlob = og
      ? await put(`shares/${id}/og.png`, og.buf, { access: "public", contentType: "image/png" })
      : null;

    const manifest: ShareManifest = {
      v: 1,
      title,
      imageUrl: imageBlob.url,
      manualUrl: manualBlob?.url,
      ogUrl: ogBlob?.url ?? imageBlob.url,
      result: body.result as ShareManifest["result"],
    };
    const manifestBlob = await put(`shares/${id}/manifest.json`, JSON.stringify(manifest), {
      access: "public",
      contentType: "application/json",
    });

    const origin = req.nextUrl.origin;
    const shareUrl = `${origin}/s?d=${encodeURIComponent(manifestBlob.url)}`;
    return NextResponse.json({ shareUrl, imageUrl: manifest.ogUrl });
  } catch (e) {
    console.error("[/api/share] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
