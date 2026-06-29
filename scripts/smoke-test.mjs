// End-to-end smoke test against a running server.
// Run: PORT=3000 node scripts/smoke-test.mjs   (start the app first: npm run dev)
import { readFileSync } from "node:fs";

const PORT = process.env.PORT || "3000";
const URL = `http://localhost:${PORT}/api/analyze`;
const IMG = "data:image/png;base64," + readFileSync("public/test-pattern.png").toString("base64");

async function run(label, body) {
  const start = Date.now();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`\n#### ${label} (HTTP ${res.status}, ${Date.now() - start}ms) ####`);
  if (!res.ok) return console.log("ERROR:", data);
  console.log("profile:", data.profile.title, "| render:", data.profile.renderStyle);
  console.log(
    "annotations:",
    data.annotations.map((a) => ({ label: a.label, box: a.box_2d, score: a.score })),
  );
  console.log("speed:", {
    tps: data.speed.tokensPerSecond,
    wallMs: data.speed.wallClockMs,
    calls: data.speed.parallelCalls,
    keys: data.speed.keysUsed,
  });
  if (data.warnings) console.log("warnings:", data.warnings);
}

await run("Planner path (freeform goal)", {
  goal: "Identify each colored region and tell me what it is",
  images: [IMG],
});
await run("Preset path (gym)", { presetId: "gym", images: [IMG] });
