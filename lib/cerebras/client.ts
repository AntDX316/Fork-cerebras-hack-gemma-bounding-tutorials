import "server-only";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { env, type ReasoningEffort } from "@/lib/env";

/**
 * Native Cerebras SDK wrapper with a round-robin key pool.
 * Multiple comma-separated keys widen the parallel window for fan-out.
 */

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/** Per-request timing returned natively by Cerebras (seconds). */
export interface TimeInfo {
  queue_time?: number;
  prompt_time?: number;
  completion_time?: number;
  total_time?: number;
}

export interface ChatResult {
  content: string;
  usage: Usage;
  timeInfo: TimeInfo;
  /** Which key-pool index actually served this call (for metrics + spread). */
  clientIndex: number;
  raw: unknown;
}

export interface ChatParams {
  messages: unknown[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  reasoningEffort?: ReasoningEffort;
  /** A full json_schema response_format object (see schemas/*). */
  responseFormat?: unknown;
  /** Pin a specific key in the pool (for round-robin fan-out / metrics). */
  clientIndex?: number;
}

let clients: Cerebras[] | null = null;

/**
 * The native SDK appends `/v1` itself (and auto-reads CEREBRAS_BASE_URL), so a
 * value ending in `/v1` would double to `/v1/v1`. Strip it; the env can still
 * hold the standard `https://api.cerebras.ai/v1` form used by raw HTTP/curl.
 */
function nativeBaseUrl(url: string): string {
  return url.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
}

function getClients(): Cerebras[] {
  if (clients) return clients;
  if (env.cerebrasApiKeys.length === 0) {
    throw new Error(
      "No Cerebras API key configured. Set CEREBRAS_API_KEYS (or CEREBRAS_API_KEY) in .env.local",
    );
  }
  const baseURL = nativeBaseUrl(env.cerebrasBaseUrl);
  clients = env.cerebrasApiKeys.map(
    (apiKey) => new Cerebras({ apiKey, baseURL } as ConstructorParameters<typeof Cerebras>[0]),
  );
  return clients;
}

export function clientCount(): number {
  return Math.max(1, env.cerebrasApiKeys.length);
}

let rr = 0;
export function nextClientIndex(): number {
  const n = clientCount();
  const i = rr % n;
  rr += 1;
  return i;
}

function buildBody(params: ChatParams) {
  const body: Record<string, unknown> = {
    model: env.cerebrasModel,
    messages: params.messages,
    max_completion_tokens: params.maxTokens ?? env.cerebrasMaxTokens,
    temperature: params.temperature ?? 0.2,
    top_p: params.topP ?? 1,
  };
  if (params.reasoningEffort) body.reasoning_effort = params.reasoningEffort;
  if (params.responseFormat) body.response_format = params.responseFormat;
  return body;
}

/** Single non-streaming completion. Returns content + usage + native time_info. */
export async function chat(params: ChatParams): Promise<ChatResult> {
  const pool = getClients();
  const idx = (params.clientIndex ?? nextClientIndex()) % pool.length;
  const client = pool[idx];
  const body = buildBody(params);

  // The SDK's typed surface omits Cerebras-specific extras (reasoning_effort,
  // time_info), so we cast the completions OBJECT (keeping the receiver intact —
  // extracting `create` as a bare function would break its `this` binding) and
  // read fields defensively.
  const completions = client.chat.completions as unknown as {
    create: (b: unknown) => Promise<unknown>;
  };
  const resp = (await completions.create(body)) as {
    choices?: { message?: { content?: string } }[];
    usage?: Usage;
    time_info?: TimeInfo;
  };

  return {
    content: resp?.choices?.[0]?.message?.content ?? "",
    usage: resp?.usage ?? {},
    timeInfo: resp?.time_info ?? {},
    clientIndex: idx,
    raw: resp,
  };
}

/** Streaming completion; yields text deltas. Used for the freeform follow-up chat. */
export async function* chatStream(params: ChatParams): AsyncGenerator<string> {
  const pool = getClients();
  const idx = (params.clientIndex ?? nextClientIndex()) % pool.length;
  const client = pool[idx];
  const body = { ...buildBody(params), stream: true };

  const completions = client.chat.completions as unknown as {
    create: (b: unknown) => Promise<unknown>;
  };
  const stream = (await completions.create(body)) as AsyncIterable<{
    choices?: { delta?: { content?: string } }[];
  }>;

  for await (const chunk of stream) {
    const t = chunk?.choices?.[0]?.delta?.content;
    if (t) yield t;
  }
}

function tryParse<T>(s: string): T | undefined {
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

/** Repair a truncated JSON fragment by closing dangling strings/brackets. */
function repairJson(s: string): string {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  let out = s;
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i];
  return out;
}

/**
 * Robustly parse a JSON object out of a model response: direct parse, then a
 * first-brace..last-brace slice, then a bracket-closing repair for truncated
 * output. Callers coerce missing fields to safe defaults.
 */
export function parseJson<T>(content: string): T {
  const direct = tryParse<T>(content);
  if (direct !== undefined) return direct;

  const start = content.indexOf("{");
  if (start !== -1) {
    const tail = content.slice(start);
    const end = tail.lastIndexOf("}");
    if (end !== -1) {
      const sliced = tryParse<T>(tail.slice(0, end + 1));
      if (sliced !== undefined) return sliced;
    }
    const repaired = tryParse<T>(repairJson(tail));
    if (repaired !== undefined) return repaired;
  }
  throw new Error("Could not parse JSON from model output: " + content.slice(0, 160));
}
