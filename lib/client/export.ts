/**
 * Client-only export helpers. Composite the analyzed image + overlays into a
 * shareable PNG "report card" on a canvas (nothing leaves the browser), plus
 * download / Web Share / clipboard / JSON helpers.
 */
import type { AnalyzeResult } from "@/schemas/annotation";
import { scoreColor } from "@/lib/color";

const W = 1080;
const PAD = 40;
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const INK = "#0f172a";
const MUTED = "#64748b";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for export"));
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawOverlays(ctx: CanvasRenderingContext2D, result: AnalyzeResult, imgH: number) {
  for (const a of result.annotations) {
    if (a.render === "region") {
      const [y1, x1, y2, x2] = a.box_2d;
      const x = (Math.min(x1, x2) / 1000) * W;
      const y = (Math.min(y1, y2) / 1000) * imgH;
      const w = (Math.abs(x2 - x1) / 1000) * W;
      const h = (Math.abs(y2 - y1) / 1000) * imgH;
      ctx.fillStyle = `${a.color}22`;
      roundRect(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = a.color;
      roundRect(ctx, x, y, w, h, 10);
      ctx.stroke();
      if (a.stepOrder > 0) drawBadge(ctx, String(a.stepOrder), x, y, a.color, "#fff");
      if (a.scored) drawBadge(ctx, a.score.toFixed(1), x + w, y, "#fff", a.color);
    } else {
      const cx = (a.point.x / 1000) * W;
      const cy = (a.point.y / 1000) * imgH;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      if (a.scored) {
        ctx.font = `700 13px ${FONT}`;
        const label = a.score.toFixed(1);
        const tw = ctx.measureText(label).width + 12;
        roundRect(ctx, cx - tw / 2, cy - 34, tw, 20, 10);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.fillStyle = a.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, cx, cy - 23);
      }
    }
  }
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  bg: string,
  fg: string,
) {
  const r = 13;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 1);
}

/** Build a shareable report-card canvas from the image + result. */
export async function buildReportCanvas(src: string, result: AnalyzeResult): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const imgH = Math.round((W * img.naturalHeight) / Math.max(1, img.naturalWidth));
  const innerW = W - PAD * 2;

  // Measuring pass to compute the content height below the image.
  const measure = document.createElement("canvas").getContext("2d")!;
  const summaryLines: string[] = [];
  measure.font = `15px ${FONT}`;
  for (const s of result.summary) summaryLines.push(...wrapText(measure, `•  ${s}`, innerW));

  type ItemLayout = { label: string; score: string; color: string; fixLines: string[] };
  const items: ItemLayout[] = result.annotations.map((a) => {
    measure.font = `14px ${FONT}`;
    const fixLines = a.fix ? wrapText(measure, a.fix, innerW - 26) : [];
    return {
      label: a.label,
      score: a.scored ? `${a.score.toFixed(1)}/10` : "",
      color: a.color,
      fixLines,
    };
  });

  let contentH = PAD; // top padding of content area
  contentH += 30; // title row
  if (summaryLines.length) {
    contentH += 26 + summaryLines.length * 22 + 10;
  }
  if (items.length) {
    contentH += 22; // "Guidance" heading
    for (const it of items) contentH += 24 + Math.max(0, it.fixLines.length) * 19 + 8;
  }
  if (result.tip) {
    measure.font = `14px ${FONT}`;
    const tipLines = wrapText(measure, `Tip: ${result.tip}`, innerW - 24);
    contentH += 12 + tipLines.length * 20 + 24;
  }
  contentH += 34; // footer/watermark

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = imgH + contentH;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Image
  ctx.drawImage(img, 0, 0, W, imgH);

  // Top banner: title + overall score
  const bannerH = 72;
  const grad = ctx.createLinearGradient(0, 0, 0, bannerH);
  grad.addColorStop(0, "rgba(2,6,23,0.72)");
  grad.addColorStop(1, "rgba(2,6,23,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, bannerH);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(result.profile.title, PAD, 40);
  if (result.overallScore != null) {
    const label = `${result.overallScore.toFixed(1)}/10`;
    ctx.font = `700 20px ${FONT}`;
    const tw = ctx.measureText(label).width + 24;
    const bx = W - PAD - tw;
    roundRect(ctx, bx, 18, tw, 32, 16);
    ctx.fillStyle = scoreColor(result.overallScore);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(label, bx + tw / 2, 40);
    ctx.textAlign = "left";
  }

  // Overlays
  drawOverlays(ctx, result, imgH);

  // Content area below the image
  let y = imgH + PAD;
  ctx.fillStyle = INK;
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText(result.profile.summaryLabel, PAD, y + 8);
  y += 30;

  if (summaryLines.length) {
    y += 18;
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = "#334155";
    for (const line of summaryLines) {
      ctx.fillText(line, PAD, y);
      y += 22;
    }
    y += 10;
  }

  if (items.length) {
    ctx.font = `600 15px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText("Guidance", PAD, y);
    y += 22;
    for (const it of items) {
      ctx.beginPath();
      ctx.arc(PAD + 6, y - 4, 6, 0, Math.PI * 2);
      ctx.fillStyle = it.color;
      ctx.fill();
      ctx.font = `600 15px ${FONT}`;
      ctx.fillStyle = INK;
      const head = it.score ? `${it.label}  ·  ${it.score}` : it.label;
      ctx.fillText(head, PAD + 22, y);
      y += 22;
      ctx.font = `14px ${FONT}`;
      ctx.fillStyle = "#475569";
      for (const line of it.fixLines) {
        ctx.fillText(line, PAD + 22, y);
        y += 19;
      }
      y += 8;
    }
  }

  if (result.tip) {
    ctx.font = `14px ${FONT}`;
    const tipLines = wrapText(ctx, `Tip: ${result.tip}`, innerW - 24);
    const boxH = tipLines.length * 20 + 20;
    roundRect(ctx, PAD, y, innerW, boxH, 10);
    ctx.fillStyle = "#fffbeb";
    ctx.fill();
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, innerW, boxH, 10);
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    let ty = y + 24;
    for (const line of tipLines) {
      ctx.fillText(line, PAD + 12, ty);
      ty += 20;
    }
    y += boxH + 24;
  }

  // Watermark
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = "center";
  ctx.fillText("Visual Coach · Gemma 4 on Cerebras", W / 2, canvas.height - 16);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJSON(result: AnalyzeResult, filename: string) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

/** Returns true if the native share sheet handled it; false to fall back. */
export async function shareImage(blob: Blob, title: string, text: string): Promise<boolean> {
  const file = new File([blob], "visual-coach.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title, text });
      return true;
    } catch (e) {
      // User cancelled or share failed — signal handled to avoid a surprise download.
      if (e instanceof DOMException && e.name === "AbortError") return true;
      return false;
    }
  }
  return false;
}

/**
 * Upload the exported PNG to the server (Vercel Blob) and get a public share URL.
 * Returns an error string if sharing isn't configured (no BLOB_READ_WRITE_TOKEN).
 */
export async function createShareLink(
  blob: Blob,
  title: string,
): Promise<{ shareUrl: string; imageUrl: string } | { error: string }> {
  try {
    const res = await fetch(`/api/share?title=${encodeURIComponent(title)}`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: blob,
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Sharing failed" };
    return data as { shareUrl: string; imageUrl: string };
  } catch {
    return { error: "Network error creating share link" };
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    const w = window as Window & { ClipboardItem?: typeof ClipboardItem };
    if (!navigator.clipboard || !w.ClipboardItem) return false;
    await navigator.clipboard.write([new w.ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
