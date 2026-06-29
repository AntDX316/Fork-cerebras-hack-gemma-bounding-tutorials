import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Opt-in share: uploads an exported PNG to Vercel Blob and returns a public
 * share-page URL (which unfurls the image via OG tags). Requires a Blob store
 * (BLOB_READ_WRITE_TOKEN, set automatically on Vercel). Degrades gracefully:
 * returns 501 when not configured so the client falls back to a download.
 */
export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Sharing not configured (add a Vercel Blob store)" },
      { status: 501 },
    );
  }

  const title = (req.nextUrl.searchParams.get("title") || "Visual Coach result").slice(0, 120);
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > 8_000_000) {
    return NextResponse.json({ error: "Invalid image payload" }, { status: 400 });
  }

  try {
    const id = crypto.randomUUID();
    const blob = await put(`shares/${id}.png`, buf, {
      access: "public",
      contentType: "image/png",
    });
    const origin = req.nextUrl.origin;
    const shareUrl = `${origin}/s?img=${encodeURIComponent(blob.url)}&t=${encodeURIComponent(title)}`;
    return NextResponse.json({ imageUrl: blob.url, shareUrl });
  } catch (e) {
    console.error("[/api/share] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
