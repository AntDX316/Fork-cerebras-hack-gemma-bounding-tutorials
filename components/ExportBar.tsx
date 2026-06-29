"use client";

import { useState } from "react";
import type { AnalyzeResult } from "@/schemas/annotation";
import {
  buildReportCanvas,
  canvasToBlob,
  copyImage,
  copyText,
  createShareLink,
  downloadBlob,
  downloadJSON,
} from "@/lib/client/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExportBar({ src, result }: { src: string; result: AnalyzeResult }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function pngBlob(): Promise<Blob> {
    const canvas = await buildReportCanvas(src, result);
    return canvasToBlob(canvas);
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setStatus(null);
    try {
      await fn();
    } catch {
      setStatus("Something went wrong — try again.");
    } finally {
      setBusy(null);
    }
  }

  const fileName = `visual-coach-${result.profile.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!!busy}
          onClick={() =>
            run("share", async () => {
              const blob = await pngBlob();
              const res = await createShareLink(blob, result.profile.title);
              if ("error" in res) {
                downloadBlob(blob, `${fileName}.png`);
                setStatus(`${res.error} — downloaded the image instead.`);
                return;
              }
              setShareUrl(res.shareUrl);
              const copied = await copyText(res.shareUrl);
              setStatus(copied ? "Share link copied to clipboard ✓" : "Share link ready below.");
            })
          }
        >
          {busy === "share" ? "Creating link…" : "🔗 Share link"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() =>
            run("download", async () => {
              downloadBlob(await pngBlob(), `${fileName}.png`);
              setStatus("PNG downloaded ✓");
            })
          }
        >
          ⬇ Download PNG
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() =>
            run("copy", async () => {
              const ok = await copyImage(await pngBlob());
              setStatus(ok ? "Image copied to clipboard ✓" : "Clipboard image not supported here.");
            })
          }
        >
          📋 Copy image
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          onClick={() =>
            run("json", async () => {
              downloadJSON(result, `${fileName}.json`);
              setStatus("JSON exported ✓");
            })
          }
        >
          {"{ }"} JSON
        </Button>
      </div>

      {status && <p className="mt-2 text-xs text-muted-foreground">{status}</p>}

      {shareUrl && (
        <div className="mt-2 flex gap-2">
          <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={() => void copyText(shareUrl)}>
            Copy
          </Button>
        </div>
      )}
    </div>
  );
}
