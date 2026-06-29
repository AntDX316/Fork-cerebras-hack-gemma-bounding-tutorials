import "server-only";
import { env } from "@/lib/env";
import type { SpeedReport } from "@/schemas/annotation";

/**
 * Lightweight enterprise audit log. No images or PII are recorded — only the
 * mode, item count, and Cerebras throughput. In production this would append to
 * Postgres/S3; here it logs to the server console when AUDIT_LOG=1.
 */
export function audit(entry: {
  mode: string;
  presetId?: string;
  regionCount: number;
  speed: SpeedReport;
}): void {
  if (!env.auditLog) return;
  console.log(
    JSON.stringify({
      kind: "visual-coach-analyze",
      ts: new Date().toISOString(),
      mode: entry.mode,
      presetId: entry.presetId ?? null,
      regions: entry.regionCount,
      tokens: entry.speed.totalTokens,
      tokensPerSecond: entry.speed.tokensPerSecond,
      wallClockMs: entry.speed.wallClockMs,
      keysUsed: entry.speed.keysUsed,
    }),
  );
}
