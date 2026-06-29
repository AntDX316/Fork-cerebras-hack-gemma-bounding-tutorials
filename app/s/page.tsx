import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";

type SearchParams = Promise<{ img?: string; t?: string }>;

function clean(sp: { img?: string; t?: string }) {
  const img = typeof sp.img === "string" && sp.img.startsWith("https://") ? sp.img : null;
  const title = (sp.t || "Visual Coach result").slice(0, 140);
  return { img, title };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { img, title } = clean(await searchParams);
  const description = "Instant on-image visual guidance, powered by Gemma 4 on Cerebras.";
  return {
    title: `${title} · Visual Coach`,
    description,
    openGraph: {
      title,
      description,
      images: img ? [{ url: img }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: img ? [img] : [],
    },
  };
}

export default async function SharePage({ searchParams }: { searchParams: SearchParams }) {
  const { img, title } = clean(await searchParams);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <Button variant="outline" size="sm" render={<Link href="/" />}>
            Try Visual Coach
          </Button>
        </div>

        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={title}
            className="w-full rounded-2xl ring-1 ring-border"
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-input p-10 text-center text-sm text-muted-foreground">
            This share link is missing its image.
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Generated with Visual Coach · Gemma 4 31B on Cerebras
        </p>
      </div>
    </main>
  );
}
