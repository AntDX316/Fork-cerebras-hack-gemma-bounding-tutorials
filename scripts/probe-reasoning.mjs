import Cerebras from "@cerebras/cerebras_cloud_sdk";

const apiKey = (process.env.CEREBRAS_API_KEYS ?? process.env.CEREBRAS_API_KEY ?? "")
  .split(",")[0]
  .trim();
const baseURL = (process.env.CEREBRAS_BASE_URL ?? "https://api.cerebras.ai/v1").replace(
  /\/v1\/?$/,
  "",
);
const model = process.env.CEREBRAS_MODEL ?? "gemma-4-31b";
const client = new Cerebras({ apiKey, baseURL });

function row(label, resp) {
  const msg = resp?.choices?.[0]?.message ?? {};
  const reasoning = msg.reasoning ?? msg.reasoning_content ?? null;
  const u = resp?.usage ?? {};
  const details = u.completion_tokens_details ?? {};
  return {
    label,
    finish: resp?.choices?.[0]?.finish_reason,
    contentLen: (msg.content ?? "").length,
    contentHead: (msg.content ?? "").replace(/\s+/g, " ").slice(0, 60),
    reasoningField: reasoning ? "YES" : "no",
    reasoningLen: reasoning ? reasoning.length : 0,
    msgKeys: Object.keys(msg).join(","),
    prompt_toks: u.prompt_tokens,
    completion_toks: u.completion_tokens,
    reasoning_toks: details.reasoning_tokens ?? "—",
    total_time: resp?.time_info?.total_time?.toFixed?.(3),
  };
}

async function call(label, { effort, maxTokens, structured, prompt }) {
  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: maxTokens,
    temperature: 0.2,
    top_p: 1,
  };
  if (effort !== undefined) body.reasoning_effort = effort;
  if (structured) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "answer",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: { answer: { type: "string" }, confidence: { type: "number" } },
          required: ["answer", "confidence"],
        },
      },
    };
  }
  try {
    const resp = await client.chat.completions.create(body);
    return row(label, resp);
  } catch (e) {
    return { label, error: (e?.message ?? String(e)).slice(0, 120) };
  }
}

const SIMPLE = "Explain in one sentence why the sky is blue.";
const HARD =
  "A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. How much is the ball? Think step by step, then give the number.";

const tests = [
  ["text effort=none      ", { effort: "none", maxTokens: 2048, prompt: SIMPLE }],
  ["text effort=low       ", { effort: "low", maxTokens: 2048, prompt: SIMPLE }],
  ["text effort=medium    ", { effort: "medium", maxTokens: 2048, prompt: SIMPLE }],
  ["text effort=high      ", { effort: "high", maxTokens: 2048, prompt: SIMPLE }],
  ["json effort=none      ", { effort: "none", maxTokens: 2048, structured: true, prompt: SIMPLE }],
  ["json effort=low       ", { effort: "low", maxTokens: 2048, structured: true, prompt: SIMPLE }],
  ["json effort=high      ", { effort: "high", maxTokens: 2048, structured: true, prompt: SIMPLE }],
  ["HARD effort=low       ", { effort: "low", maxTokens: 4096, prompt: HARD }],
  ["HARD effort=high      ", { effort: "high", maxTokens: 4096, prompt: HARD }],
  ["HARD effort=high cap96", { effort: "high", maxTokens: 96, prompt: HARD }],
];

console.log("model:", model, "| baseURL:", baseURL, "| key:", apiKey.slice(0, 10) + "…");
console.log("");
for (const [label, opts] of tests) {
  const r = await call(label, opts);
  if (r.error) {
    console.log(label, "ERROR:", r.error);
    continue;
  }
  console.log(
    label,
    "| finish:", String(r.finish).padEnd(6),
    "| reason:", r.reasoningField,
    "len:", String(r.reasoningLen).padStart(5),
    "| rtoks:", String(r.reasoning_toks).padStart(5),
    "| ctoks:", String(r.completion_toks).padStart(4),
    "| t:", r.total_time,
    "| content:", r.contentHead,
  );
  if (opts.effort === "none" && label.startsWith("text")) console.log("   msgKeys:", r.msgKeys);
}
