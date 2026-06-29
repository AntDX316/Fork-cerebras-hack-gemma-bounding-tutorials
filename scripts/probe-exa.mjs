import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);
// Simulates the resource-oriented query: "<item> <goal>".
const query = "lat pulldown machine how to use which muscles";
const res = await exa.searchAndContents(query, {
  numResults: 3,
  text: { maxCharacters: 600 },
  summary: true,
});
console.log("query:", query);
for (const r of res.results ?? []) {
  console.log("•", (r.title ?? "").slice(0, 70), "→", r.url);
  console.log("   ", (r.summary ?? r.text ?? "").replace(/\s+/g, " ").slice(0, 110));
}
