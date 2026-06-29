# Visual Coach — Gemma 4 (31B) on Cerebras

Point your camera (or upload a photo) at **anything** and get **instant on-image guidance** — labeled
dots / boxes / numbered steps, scores, color-coding, and "what you're doing well + how to fix it"
tooltips — instead of a wall of text. Built for the **Cerebras × Google DeepMind Gemma 4 hackathon**.

The four examples (posture, fridge/nutrition, assembly/repair, gym) are just **presets**. There are no
fixed categories: a **Planner agent** reads your goal + image and designs the overlay on the fly, so it
works for bike repair, wiring, plating a dish, plant health — whatever you point it at.

> Powered by `gemma-4-31b` on Cerebras. Cerebras's ultra-fast inference is what makes the overlays feel
> instant and lets the per-item coaching run in a parallel fan-out.

## How it works (multi-agent pipeline)

```
photo / webcam frame (base64, in-memory only — never uploaded to any host)
        │  POST /api/analyze
        ▼
ORCHESTRATOR  (lib/agents/orchestrator.ts)
  1. PLANNER      → TaskProfile (renderStyle, scored?, sequence?, research?, targetDescription)
  2. GROUNDING    → regions[] with box_2d [y1,x1,y2,x2] on a 0..1000 grid
  3. FAN-OUT per region, round-robin across API keys (the speed showcase):
        RESEARCH (Exa, optional)  →  COACH (score + what's good + fix + facts)
  4. SEQUENCER    → orders steps for "steps" mode
  5. OVERVIEW     → whole-image summary + tip + overall score
        ▼
AnalyzeResult → SVG/HTML overlay (dots, regions, tooltips, step timeline) + live Cerebras speed HUD
```

- **Track 1 (Multi-Agent + Multimodal):** Planner → Grounding → Coach×N → Research → Sequencer → Overview, coordinated with a parallel fan-out.
- **Track 3 (Enterprise):** the assembly/repair preset is the field-service / training use case. `/api/analyze` is stateless, returns strict structured JSON, and persists no images (optional audit log via `AUDIT_LOG=1`).
- **Track 2 (People's Choice):** the speed HUD (tokens/sec, TTFT, parallel calls) is the demo money-shot.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                   # http://localhost:3000
```

### Environment (`.env.local`)

| Var | Purpose |
| --- | --- |
| `CEREBRAS_API_KEYS` | Your Cerebras key. **Comma-separate multiple keys** (yours + teammates') to widen the parallel fan-out window. `CEREBRAS_API_KEY` (singular) also works. |
| `CEREBRAS_BASE_URL` | `https://api.cerebras.ai/v1` (the `/v1` is stripped automatically for the native SDK). |
| `CEREBRAS_MODEL` | `gemma-4-31b` |
| `CEREBRAS_MAX_TOKENS` | default `max_completion_tokens` |
| `EXA_API_KEY` | web search for the Research agent |
| `BLOB_READ_WRITE_TOKEN` | optional Vercel Blob token for public share links; Vercel sets this when you attach a Blob store |
| `AUDIT_LOG` | `1` to log per-request mode/tokens/latency (no images, no PII) |

Secrets stay server-side — the browser only ever calls `/api/*`.

### Export and sharing

After an analysis, the export bar can:

- download a PNG report card with the image, overlays, scores, summary, and guidance;
- copy that PNG to the clipboard when the browser supports image clipboard writes;
- download the structured analysis JSON;
- create an optional public share link backed by Vercel Blob.

The PNG, copy, and JSON actions run entirely in the browser. By default, images are ephemeral and are not stored by the app. Clicking **Share link** is an intentional upload of the generated PNG to Vercel Blob so `/s?img=...&t=...` can render a public share page with OpenGraph/Twitter unfurl tags. If `BLOB_READ_WRITE_TOKEN` is not configured, sharing falls back to a local PNG download.

## Verify the integration

```bash
# Cerebras: text, image passthrough, structured outputs, grounding, reasoning
node --env-file=.env.local scripts/verify-cerebras.mjs

# Full pipeline against a running server (start `npm run dev` first)
node scripts/smoke-test.mjs
```

`/api/health` is a live probe (keys configured, text OK, image passthrough OK).

## Using it

1. Pick a preset **or** type any goal (e.g. "adjust my bike derailleur").
2. Upload a photo (1st = scene, optional 2nd = manual/reference) **or** use the webcam (snapshot or live).
3. Hover the dots/boxes for guidance; "steps" tasks get a play/scrub timeline.
4. Ask a follow-up — answers stream token-by-token.

## Implementation notes / gotchas (verified against the live API)

- **Coordinates:** Gemma emits boxes as `[y1, x1, y2, x2]` integers normalized to a **0..1000 grid** (each axis independent). The stage sizes its container to the image's aspect ratio so these map straight to CSS percentages — no letterboxing math.
- **Native SDK base URL:** `@cerebras/cerebras_cloud_sdk` appends `/v1` itself (and auto-reads `CEREBRAS_BASE_URL`); a value ending in `/v1` doubles to `/v1/v1`. We strip it in `lib/cerebras/client.ts`.
- **Structured outputs:** strict mode requires `additionalProperties: false` and all keys in `required` on every object, and **rejects `minItems`/`maxItems`** — array lengths are coerced in code.
- **Images:** base64 data URIs only (no hosted URLs), ≤5 per request; downscaled to ~1024px client-side.
- **Reasoning:** structured calls use `reasoning_effort: none` for reliability + speed (reasoning can consume the token budget and empty out `content`).

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · framer-motion · zod · `@cerebras/cerebras_cloud_sdk` · `exa-js`. Cloud-only, single deployable (Vercel-ready).
