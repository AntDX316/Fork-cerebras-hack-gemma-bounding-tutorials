# Visual Coach — 75-second demo script

**Live URL:** https://cerebras-hack-gemma-bounding-tutori-alpha.vercel.app
**One-liner:** Point it at anything; Gemma 4 on Cerebras draws the guidance **on the image** through a multi-agent pipeline — instead of writing paragraphs.

Targets all three tracks: **Multi-Agent + Multimodal** (the pipeline), **Enterprise** (assembly/repair), **People's Choice** (the speed HUD).

---

## Before you record (5-min checklist)
- [ ] **Add teammates' Cerebras keys** to `CEREBRAS_API_KEYS` in Vercel (comma-separated) → the fan-out becomes real (`keysUsed > 1`) and the speed "race" is bigger. *This is the single most important pre-demo step.*
- [ ] Have **2 staged images** ready in a folder:
  1. A **gym** photo with a few machines (the off-script hero).
  2. An **appliance/furniture part + its manual page** as two images (enterprise steps). *Optional but strong.*
- [ ] Open the live URL, do **one throwaway analysis** to warm the serverless function (first call is slowest).
- [ ] Pick **dark or light** and stick with it. Close other tabs.
- [ ] Zoom the browser so the 3-column layout fits; collapse the left panel after you've shown it if you want the image bigger.

---

## The script (≈75s)

### 0:00–0:08 — Hook
> "This is Visual Coach. Point it at anything and **Gemma 4 — on Cerebras** — draws the guidance directly on the image, through a team of agents."

*Action:* Land on the page. Gesture at the big "describe anything" box and the four example chips.

### 0:08–0:30 — Unlimited modes (the wow): off-script goal
*Action:* Upload the **gym** photo. In the box, type a goal that is **not** a preset:
> **"which machine should I use for back, and how do I set it up?"**

Click **Analyze ⚡**.

> "I didn't pick a category — a **Planner agent** reads my goal and the image and designs the overlay on the fly. Grounding locates each machine, then a Coach runs **in parallel per machine**, and a Research agent pulls how-to links."

*Action:* As it returns (~2s), **hover one machine** → tooltip shows what's good / the fix / **how-to resource links**. Point at the right-column **Resources** panel.

### 0:30–0:45 — Interactive tutorial
*Action:* Toggle **Auto-zoom** (top-left of the image) → it tours and zooms into each machine. Then hit **⤢ Expand** for the full-screen view.
> "It's an interactive tutorial — zoom into any part, follow the guided tour, open a real source."

### 0:45–0:58 — Enterprise (optional, Track 3)
*Action:* Pick the **Assembly / Repair** preset, upload **part + manual** (two images).
> "Same engine, field-service use case: ordered steps animate, and it highlights the matching part in the manual. The endpoint is stateless, returns structured JSON, and persists no images."

### 0:58–1:15 — The speed story (close on this — People's Choice)
*Action:* Point at the **Cerebras Speed** card.
> "Here's why it feels instant. This was **N coordinated model calls** — Planner, Grounding, several **Coaches in parallel**, Overview — at a **peak of ~2,400 tokens/sec**. The total model time was X seconds, but it was delivered in Y because the coach calls **fan out in parallel across Cerebras**."

*Action:* Read the **race bars** (Actual vs sequential), the **"N× faster"** badge, and the one-line recap: *"Gemma located N items, coached M in parallel, used K web sources, in Y.Ys."*

### (Optional 1:15–1:25) — Share
*Action:* Click **🔗 Share link** → open the `/s` page.
> "And anyone I send this to gets the **live, interactive** result — hover the markers, ask a follow-up — not a screenshot."

---

## Voiceover cheat-sheet (the three lines that must land)
1. **Unlimited modes:** "I didn't pick a category — the Planner designs the overlay from my goal."
2. **Multi-agent + parallel:** "Grounding locates, then a Coach runs in parallel per item, with a Research agent for sources."
3. **Cerebras speed:** "Total model time X, delivered in Y — the fan-out runs in parallel on Cerebras."

## If something goes wrong (fallbacks)
- Off-script goal returns sparse boxes → switch to the **Gym** preset (same image) for a reliable result, keep the same narration.
- Network/rate-limit hiccup → you added multiple keys, so retry once; the serverless warm-up call you did earlier prevents the cold-start stall.
- Keep the **Fridge / Nutrition** preset as a guaranteed crowd-pleaser (dots + health score + nutrition facts from web search).
