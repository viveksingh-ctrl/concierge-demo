// Standalone verification of the SDK's streamText path (no Next.js involved).
// Run: npm run smoke
import { readFileSync } from "node:fs";
import { ConciergeAgent, ContentstackRegion } from "@contentstack/agents-sdk";

// Minimal .env.local loader
function loadEnv() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnv();

const apiKey = process.env.CONCIERGE_API_KEY;
if (!apiKey) throw new Error("CONCIERGE_API_KEY missing");

const agent = new ConciergeAgent({
  apiKey,
  region:
    process.env.CONCIERGE_REGION === "AWS_NA"
      ? ContentstackRegion.AWS_NA
      : ContentstackRegion.AZURE_EU,
  platform: "smoke-test",
});

const prompt = process.argv[2] || "Voglio Vedere dei divani in pelle";
console.log(`\n▶ streamText prompt: "${prompt}"\n`);

const run = agent.streamText({
  prompt,
  userId: process.env.CONCIERGE_USER_ID,
});

// Option A from the docs: iterate text deltas as they arrive
let deltas = 0;
process.stdout.write("STREAMED TEXT: ");
for await (const delta of run.textStream) {
  process.stdout.write(delta);
  deltas++;
}

// Option C: await the final result
const result = await run.done;

console.log("\n\n─── RESULT ───");
console.log("text deltas received :", deltas);
console.log("threadId             :", result.threadId);
console.log("userId               :", result.userId);
console.log("metadata items       :", result.metadata.length);
for (const m of result.metadata) console.log("   content_uid:", m.content_uid);
console.log("sources              :", result.sources.length);
console.log("final text length    :", result.text.length);
console.log("\n✅ streamText works end-to-end.");
