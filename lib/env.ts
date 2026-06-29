import "server-only";

/**
 * Server-only environment access. Never import this from a "use client" module.
 * Secrets stay on the server; the browser only ever talks to /api/*.
 */

export type ReasoningEffort = "none" | "low" | "medium" | "high";

function splitKeys(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const reasoning = (process.env.CEREBRAS_REASONING_EFFORT ?? "none") as ReasoningEffort;

export const env = {
  cerebrasApiKeys: splitKeys(process.env.CEREBRAS_API_KEYS ?? process.env.CEREBRAS_API_KEY),
  cerebrasBaseUrl: process.env.CEREBRAS_BASE_URL ?? "https://api.cerebras.ai/v1",
  cerebrasModel: process.env.CEREBRAS_MODEL ?? "gemma-4-31b",
  cerebrasMaxTokens: Number(process.env.CEREBRAS_MAX_TOKENS ?? 4096),
  cerebrasReasoningEffort: reasoning,
  exaApiKey: process.env.EXA_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  auditLog: process.env.AUDIT_LOG === "1",
} as const;
