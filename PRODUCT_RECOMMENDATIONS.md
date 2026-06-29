# Visual Coach Product Recommendations

This is a product audit of the current app state, focused on making Visual Coach easier to use, more helpful after analysis, better for public sharing, and stronger at showcasing Cerebras speed.

## Current Product Shape

Visual Coach already has a strong technical core:

- A flexible multi-agent flow: Planner -> Grounding -> parallel Research/Coach -> Sequencer -> Overview.
- A broad input promise: upload, webcam snapshot, live camera loop, optional second reference image.
- A high-value output: on-image dots/boxes/steps, scores, tooltips, resources, follow-up chat, share/export.
- A speed story: the app measures peak tokens/sec, aggregate tokens/sec, TTFT, wall clock, model calls, keys used, and per-call timings.

The main product gap is that the app hides too much of that value until after a successful analysis, and some features are discoverable only by reading UI microcopy or hovering the image. The result is technically impressive, but not yet as immediately legible or demo-ready as it could be.

## Highest-Impact Recommendations

### 1. Add A One-Click Guided Demo Path

**Problem:** The first screen asks users to provide a goal and image before they understand what the product can do. The center stage is empty, and the selected default preset is hidden behind an empty prompt box.

**Evidence:** `Analyzer` defaults to `presetId = "fridge"` while `goal` is empty, so clicking Analyze after upload uses a hidden preset. `ModePicker` shows the prompt box as primary but does not expose the selected preset goal. The empty stage says only "Upload a photo or use your webcam to begin."

**Recommendation:** Add a "Try a demo" rail with 3-4 curated examples that include sample images and expected mode:

- Gym machine setup: regions + setup score + resources.
- Assembly/repair: steps + manual/reference highlight.
- Fridge/nutrition: dots + health score + web facts.
- Posture/form: dots + score + quick fixes.

Each demo should load a sample image, set the prompt, and either run the real pipeline or use an included cached result when no keys are configured.

**Why it helps:** Users see the value in one click. Hackathon judges can immediately understand the core promise without taking a photo or guessing a prompt.

**Success metric:** Time from page load to first meaningful overlay under 10 seconds for a new user.

### 2. Make The Selected Task Explicit Before Analysis

**Problem:** Users can have a selected preset, a custom prompt, a first image, and an optional manual, but the UI does not show a clear "this is what will happen" summary.

**Recommendation:** Add a compact "Analysis plan" panel below upload:

- Mode: Fridge/Nutrition, Custom planner, Assembly steps, etc.
- Inputs: Scene image, optional reference image.
- Output: Dots, boxes, or step sequence.
- Cost/speed mode: Fast or Thorough.

For presets, show the actual preset goal text and let users edit it. If they edit it, switch visibly into custom mode.

**Why it helps:** It removes ambiguity and makes the Planner feel like a product feature, not an invisible implementation detail.

**Implementation shape:** Derive a `pendingPlan` object from `presetId`, `goal`, `previewImages`, and `captureMode`. Render it next to the Analyze button.

### 3. Add A Clickable Guidance List That Controls The Image

**Problem:** The most important advice lives inside hover tooltips on the image. Hover is weak on touch devices, and users need a scannable list of all findings.

**Recommendation:** Add a "Guidance" list in the results panel:

- One row per annotation.
- Label, score, top fix, and resource count.
- Click row to focus/auto-zoom the marker on the image.
- "Show only this" or "Next issue" controls.

**Why it helps:** The app becomes useful even when the image is dense, the device is mobile, or the user wants to work through fixes one by one.

**Implementation shape:** Move `hover`/focused annotation state up from `ImageStage` into `Analyzer`/`SharedView`, then pass `focusedAnnotationId` and `onFocusAnnotation` into `ImageStage` and the new list.

### 4. Turn The Speed HUD Into A Speed Story

**Problem:** The speed HUD shows numbers, but it does not make the multi-agent speed advantage obvious. It hides the strongest narrative: many model calls completed as a coordinated pipeline, with parallel coach calls spread across keys.

**Recommendation:** Replace or expand the Speed HUD with a "Pipeline race" component:

- Timeline bars for Planner, Grounding, parallel Coach calls, Research, Overview.
- "Actual: 1.8s" vs "Serial estimate: 5.6s" when per-call total times are available.
- Peak tokens/sec, TTFT, model calls, and keys used.
- A small "why this feels instant" explainer in the card footer.

**Why it helps:** Judges and users see Cerebras as the reason the app works, not just a vendor name in the header.

**Implementation shape:** `speed.perCall` already carries agent names, total times, and tokens. Add enough metadata to compute serial estimate and group calls by agent prefix, then render a compact horizontal timeline.

### 5. Show Progress While Analysis Is Running

**Problem:** During analysis, the app only says "Gemma 4 is analyzing on Cerebras..." The pipeline is interesting, and the user has no sense of whether the app is stuck or racing through stages.

**Recommendation:** Add an animated pipeline progress strip during loading:

1. Planning task
2. Locating targets
3. Coaching items in parallel
4. Writing summary
5. Rendering overlay

Use optimistic client-side stage timing first. Later, stream real progress events from `/api/analyze`.

**Why it helps:** It turns waiting into a demo moment and reinforces the multi-agent architecture.

**Implementation shape:** For v1, local timed states are enough. For v2, return an event stream or split the analysis endpoint into a job stream.

### 6. Expose Fast Vs Thorough As A User Choice

**Problem:** The app has a hidden `fast` path only for live webcam frames. Normal analysis uses more reasoning for quality, but the user cannot choose latency vs depth.

**Recommendation:** Add a segmented control near Analyze:

- Fast demo: no reasoning, fewer regions, minimum latency.
- Balanced: current default.
- Thorough: more regions/resources, best answer.

Show estimated tradeoffs in plain language: "Fast is best for live camera. Thorough may take longer but gives richer coaching."

**Why it helps:** Users understand why one run is blazing fast and another is richer. It also makes Cerebras speed easier to demonstrate because "Fast demo" becomes intentional.

### 7. Add Suggested Follow-Ups And Keep Conversation History

**Problem:** The follow-up box is useful but starts blank and forgets previous turns visually. Users often do not know what to ask.

**Recommendation:** After analysis, generate or derive 3 follow-up chips:

- "What should I fix first?"
- "Why did this score low?"
- "Give me a 3-step plan."
- Resource-specific prompts when citations exist.

Keep a small threaded chat history instead of replacing the answer each time.

**Why it helps:** It turns the app from a one-shot analyzer into a coach.

### 8. Make Share Consent And Privacy Explicit

**Problem:** The current README describes sharing as uploading a generated PNG, but the current implementation uploads a clean scene image, optional manual image, an OG PNG, and a public JSON manifest containing the analysis result. The UI also does not warn that a share link is public.

**Recommendation:** Add a one-time share confirmation modal:

- "This creates a public, unlisted interactive result."
- "Uploads: scene image, optional reference image, analysis JSON, preview PNG."
- "Do not share sensitive photos."
- Optional checkbox: "Do not show again."

Update README to match the current implementation.

**Why it helps:** This is both product trust and deployment hygiene. It prevents surprise persistence of clean images.

### 9. Add Result Quality Controls

**Problem:** When detections are missing, wrong, or sparse, the app displays the output but does not help the user recover.

**Recommendation:** Add per-result recovery actions:

- "Re-run with more targets"
- "Switch to boxes/dots/steps"
- "Use faster mode"
- "Use more web research"
- "This marker is wrong" feedback button

For empty results, show a dedicated empty-result state with next steps: "try a closer shot", "change the goal", "switch to custom mode."

**Why it helps:** Users stay in the loop instead of treating one imperfect AI result as failure.

### 10. Make Multi-Image Upload Understandable

**Problem:** The upload box says "1st image = scene, 2nd = optional manual/reference", but thumbnails are unlabeled and cannot be reordered or removed.

**Recommendation:** Add thumbnail labels and controls:

- Badge: Scene, Reference 1, Reference 2.
- Remove image.
- Drag or buttons to reorder.
- Reference hint only when the selected task can use a manual/diagram.

**Why it helps:** It reduces accidental bad inputs and makes assembly/repair demos much clearer.

## Secondary Recommendations

### Better Preset Copy

The current examples are technically useful but could be more outcome-oriented:

- "Fix my form" instead of "Posture / Fitness"
- "Score my fridge" instead of "Fridge / Nutrition"
- "Guide this repair" instead of "Assembly / Repair"
- "Set up this machine" instead of "Gym Equipment"

Keep the technical preset profile behind the scenes.

### Make The Image The Main Product Surface

The collapsible side panels are useful on desktop, but the image should own the first impression. Consider defaulting the right panel collapsed until analysis is complete, then auto-opening results. On mobile, put guidance cards under the image instead of relying on hover.

### Add A "What Happened" Summary

After each analysis, show one compact line:

"Gemma found 6 items, coached 4 in parallel, used 3 web sources, and rendered this in 1.8s."

This converts raw metrics into a human-readable accomplishment.

### Make Warnings More Actionable

Current warnings are technical strings from failed pipeline stages. Convert them into user-facing recovery language:

- "Web resources were unavailable, so this answer uses visual evidence only."
- "No visible targets matched your request."
- "Try a closer photo for better boxes."

Keep raw errors server-side.

### Improve Public Share Pages

The shared page is already interactive. Add:

- "Open original prompt" and "What this analysis looked for."
- A compact privacy label: "Public unlisted share."
- A primary CTA: "Analyze your own image."
- Optional expiry indicator if Blob lifecycle rules are configured.

### Add A Demo Benchmark Panel

For Cerebras storytelling, create a dedicated small panel or route:

- "Same task, serial vs parallel"
- "Calls completed"
- "Peak tok/s"
- "Time to first token"
- "Keys used"

This can be driven by real `SpeedReport` values from the latest run.

## Prioritized Roadmap

### P0 Before Public Demo

1. Fix share/privacy copy in README and add share confirmation in UI.
2. Add one-click guided demo examples.
3. Add guidance list with click-to-focus markers.
4. Expand Speed HUD into a pipeline race/timeline.
5. Fix smoke-test metric field from `parallelCalls` to `modelCalls`.

### P1 After Demo Polish

1. Add Fast/Balanced/Thorough mode.
2. Add loading pipeline progress.
3. Add suggested follow-up chips and chat history.
4. Add multi-image labels/reorder/remove.
5. Add empty-result recovery actions.

### P2 Product Hardening

1. Validate shared manifests with a real schema before rendering.
2. Move rate limiting from in-memory to Upstash/Vercel KV.
3. Add share expiry/delete policy.
4. Add structured user feedback on bad detections.
5. Add analytics for first-run completion, share conversion, and follow-up usage.

## Success Metrics To Track

- First analysis completion rate.
- Median time from page load to first overlay.
- Percent of users who interact with at least one marker or guidance row.
- Percent of users who ask a follow-up.
- Share link creation rate.
- Public share page CTA click-through.
- Median wall-clock analysis time.
- Peak tokens/sec shown per demo.
- Empty-result rate and re-run rate.

## Product North Star

The app should feel like this:

1. I open it and immediately understand I can point it at anything.
2. I can try a high-quality demo in one click.
3. I upload or use camera and know exactly what it will analyze.
4. I see the overlay quickly, with the image as the primary workspace.
5. I can work through every recommendation without hunting for hover tooltips.
6. I can ask follow-ups naturally.
7. I understand Cerebras made the multi-agent result fast.
8. If I share, I know exactly what becomes public.
