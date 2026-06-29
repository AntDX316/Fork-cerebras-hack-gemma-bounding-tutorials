import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SharedView } from "@/components/SharedView";
import type { ShareManifest } from "@/schemas/share";

export const runtime = "nodejs";

type SearchParams = Promise<{ d?: string; img?: string; t?: string }>;

// SSRF guard: only fetch manifests from a Vercel Blob host.
function safeBlobUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.endsWith(".blob.vercel-storage.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function loadManifest(d: unknown): Promise<ShareManifest | null> {
  const url = safeBlobUrl(d);
  if (!url) return null;
  try {
    // Blob URLs are immutable (unique path) — safe to cache.
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const json = (await res.json()) as ShareManifest;
    if (!json || typeof json !== "object" || !json.result || !json.imageUrl) return null;
    return json;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const manifest = await loadManifest(sp.d);
  const legacyImg =
    typeof sp.img === "string" && sp.img.startsWith("https://") ? sp.img : null;

  const title = (manifest?.title || sp.t || "Visual Coach result").slice(0, 140);
  const ogImage = manifest?.ogUrl ?? legacyImg;
  const description = "Instant on-image visual guidance, powered by Gemma 4 31B on Cerebras.";

  return {
    title: `${title} · Visual Coach`,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function SharePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const manifest = await loadManifest(sp.d);
  const legacyImg =
    typeof sp.img === "string" && sp.img.startsWith("https://") ? sp.img : null;
  const title = (manifest?.title || sp.t || "Visual Coach result").slice(0, 140);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground">
              Shared from Visual Coach · hover the markers, scrub the steps, ask a follow-up.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" nativeButton={false} render={<Link href="/" />}>
              Try Visual Coach
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6">
        {manifest ? (
          <SharedView
            imageUrl={manifest.imageUrl}
            manualUrl={manifest.manualUrl}
            result={manifest.result}
          />
        ) : legacyImg ? (
          // Backward-compatible static render for older share links.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={legacyImg}
            alt={title}
            className="mx-auto w-full max-w-3xl rounded-2xl ring-1 ring-border"
          />
        ) : (
          <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-input p-10 text-center text-sm text-muted-foreground">
            This share link is missing or expired.
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Generated with Visual Coach · Gemma 4 31B on Cerebras
        </p>
      </div>
    </main>
  );
}
