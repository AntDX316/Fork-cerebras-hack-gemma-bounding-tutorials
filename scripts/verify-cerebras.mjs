// Phase-0 de-risk probe. Run: node --env-file=.env.local scripts/verify-cerebras.mjs
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { readFileSync, existsSync } from "node:fs";

const keys = (process.env.CEREBRAS_API_KEYS || process.env.CEREBRAS_API_KEY || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const model = process.env.CEREBRAS_MODEL || "gemma-4-31b";
console.log("Keys:", keys.length, "Model:", model, "Base:", process.env.CEREBRAS_BASE_URL);
if (!keys.length) { console.log("NO KEYS"); process.exit(1); }

// Native SDK appends /v1 itself — strip it from the configured base URL.
const baseURL = (process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai")
  .replace(/\/v1\/?$/, "").replace(/\/+$/, "");
const client = new Cerebras({ apiKey: keys[0], baseURL });

// Valid 192x192 test pattern (red left / green right / blue center square).
const IMG = existsSync("public/test-pattern.png")
  ? "data:image/png;base64," + readFileSync("public/test-pattern.png").toString("base64")
  : null;

const groundingSchema = { type: "json_schema", json_schema: { name: "grounding_set", strict: true, schema: {
  type: "object", additionalProperties: false, required: ["regions"], properties: {
    regions: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["id", "label", "box_2d"], properties: {
        id: { type: "string" }, label: { type: "string" },
        box_2d: { type: "array", items: { type: "integer" } } } } } } } } };

async function t(name, fn) {
  const start = Date.now();
  try { const r = await fn(); console.log(`\n=== ${name}: OK (${Date.now() - start}ms) ===`); console.log(r); }
  catch (e) { console.log(`\n=== ${name}: FAIL ===`, e?.status, e?.message); }
}

await t("text", async () => {
  const r = await client.chat.completions.create({
    model, messages: [{ role: "user", content: 'Reply with exactly "ok".' }],
    max_completion_tokens: 10, temperature: 0.2, top_p: 1,
  });
  return { content: r.choices?.[0]?.message?.content, tps: (r.usage?.total_tokens / r.time_info?.total_time).toFixed(0) };
});

if (IMG) await t("image-passthrough", async () => {
  const r = await client.chat.completions.create({
    model, max_completion_tokens: 60, temperature: 0.2,
    messages: [{ role: "user", content: [
      { type: "text", text: "List the main colors you see in this image." },
      { type: "image_url", image_url: { url: IMG } },
    ]}],
  });
  return { content: r.choices?.[0]?.message?.content, image_tokens: r.usage?.image_tokens };
});

if (IMG) await t("structured-grounding (effort none)", async () => {
  const r = await client.chat.completions.create({
    model, max_completion_tokens: 400, temperature: 0.2, response_format: groundingSchema,
    messages: [{ role: "user", content: [
      { type: "text", text: "Locate each distinct colored region. Return box_2d as [y1,x1,y2,x2] integers 0-1000." },
      { type: "image_url", image_url: { url: IMG } },
    ]}],
  });
  return { content: r.choices?.[0]?.message?.content, time_info_total: r.time_info?.total_time };
});

if (IMG) await t("coach-style structured (effort none)", async () => {
  const coachSchema = { type: "json_schema", json_schema: { name: "coach_item", strict: true, schema: {
    type: "object", additionalProperties: false,
    required: ["score", "whatGood", "fix", "facts", "stepOrder", "stepAction", "manualRef"], properties: {
      score: { type: "number" }, whatGood: { type: "array", items: { type: "string" } }, fix: { type: "string" },
      facts: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "value"],
        properties: { label: { type: "string" }, value: { type: "string" } } } },
      stepOrder: { type: "integer" }, stepAction: { type: "string" },
      manualRef: { type: "array", items: { type: "integer" } } } } } };
  const r = await client.chat.completions.create({
    model, max_completion_tokens: 500, temperature: 0.2, response_format: coachSchema,
    messages: [{ role: "user", content: [
      { type: "text", text: 'Item "blue square" at [330,330,660,660]. Rate it 0-10 and give brief coaching JSON.' },
      { type: "image_url", image_url: { url: IMG } },
    ]}],
  });
  return { content: r.choices?.[0]?.message?.content };
});

await t("reasoning none (json)", async () => {
  const r = await client.chat.completions.create({
    model, max_completion_tokens: 200, temperature: 0.2, reasoning_effort: "none",
    response_format: { type: "json_schema", json_schema: { name: "p", strict: true, schema: {
      type: "object", additionalProperties: false, required: ["renderStyle", "scored"], properties: {
        renderStyle: { type: "string", enum: ["dots", "regions", "steps"] }, scored: { type: "boolean" } } } } },
    messages: [{ role: "user", content: "For coaching a yoga pose, pick renderStyle and whether to score." }],
  });
  return { content: r.choices?.[0]?.message?.content };
});
