// Runs the SDK's streamText() 50 times and records every result, so we can
// judge whether @contentstack/agents-sdk is behaving consistently.
// Crash-safe: each run is isolated in try/catch and written to a JSONL ledger
// (fsync'd) immediately, plus a rolling JSON snapshot. Run: node scripts/test50.mjs
import { readFileSync, writeFileSync, openSync, writeSync, fsyncSync, closeSync } from "node:fs";
import { ConciergeAgent, ContentstackRegion } from "@contentstack/agents-sdk";

// ── env ────────────────────────────────────────────────────────────────────
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
const regionName = process.env.CONCIERGE_REGION === "AWS_NA" ? "AWS_NA" : "AZURE_EU";
const region = regionName === "AWS_NA" ? ContentstackRegion.AWS_NA : ContentstackRegion.AZURE_EU;
const userId = process.env.CONCIERGE_USER_ID;
if (!apiKey) throw new Error("CONCIERGE_API_KEY missing");

const BASE = {
  AWS_NA: "https://digital-concierge-api.csnonprod.com",
  AZURE_EU: "https://azure-eu-digital-concierge-api.contentstack.com",
}[regionName];
const expectedUrl = `${BASE}/digital-concierge/agents/${apiKey}/execute`;

console.log("──────────────── CONFIG CHECK ────────────────");
console.log("apiKey (agent id) :", apiKey);
console.log("region            :", regionName);
console.log("userId            :", userId || "(auto)");
console.log("SDK will POST to  :", expectedUrl);
console.log("──────────────────────────────────────────────\n");

const agent = new ConciergeAgent({ apiKey, region, platform: "test50" });

const PROMPT = "Voglio Vedere dei divani in pelle";
const TOTAL = 50;
const PER_CALL_TIMEOUT_MS = 45000;

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const ledgerPath = new URL(`../test50_results_${stamp}.ledger.jsonl`, import.meta.url);
const jsonPath = new URL(`../test50_results_${stamp}.json`, import.meta.url);
const ledgerFd = openSync(ledgerPath, "w");

function isSofa(name) {
  const n = (name || "").toLowerCase();
  return n.includes("sofa") || n.includes("divano") || n.includes("divani");
}

const rows = [];

async function runOne(i) {
  const row = {
    run: i,
    status: "Error",
    threadId: null,
    productUids: [],
    productNames: [],
    metadataCount: 0,
    textDeltas: 0,
    uiMessage: "",
    responseMs: null,
    error: null,
  };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PER_CALL_TIMEOUT_MS);
  const start = Date.now();
  try {
    // fresh thread every call (threadId omitted -> SDK generates a unique one)
    const run = agent.streamText({ prompt: PROMPT, userId, signal: ac.signal });

    let deltas = 0;
    for await (const _ of run.textStream) deltas++;
    const result = await run.done;

    row.responseMs = Date.now() - start;
    row.threadId = result.threadId;
    row.textDeltas = deltas;
    row.metadataCount = result.metadata?.length ?? 0;

    // Parse the model's JSON answer to pull the readable product info
    try {
      const parsed = JSON.parse(result.text);
      const fl = parsed?.data?.first_level_ids ?? [];
      row.productUids = fl.map((p) => p.id);
      row.productNames = fl.map((p) => p.name);
      row.uiMessage = parsed?.ui_message ?? "";
    } catch {
      /* text wasn't the expected JSON shape */
    }

    row.status = row.productNames.length > 0 ? "Success" : "No recommendation";
    const label = row.productNames.join(", ") || "(none)";
    console.log(`[${String(i).padStart(2)}/${TOTAL}] ${row.status} ${row.responseMs}ms deltas=${deltas} -> ${label}`);
  } catch (e) {
    row.responseMs = Date.now() - start;
    row.status = ac.signal.aborted ? "Timeout" : "Error";
    row.error = String(e?.message || e).slice(0, 120);
    console.log(`[${String(i).padStart(2)}/${TOTAL}] ${row.status}: ${row.error}`);
  } finally {
    clearTimeout(timer);
  }
  return row;
}

for (let i = 1; i <= TOTAL; i++) {
  const row = await runOne(i);
  rows.push(row);
  // crash-safe append
  writeSync(ledgerFd, JSON.stringify(row) + "\n");
  fsyncSync(ledgerFd);
  // rolling snapshot every 10
  if (i % 10 === 0 || i === TOTAL) {
    writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
    console.log(`   ...snapshot at ${i}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}
closeSync(ledgerFd);

// ── summary ──────────────────────────────────────────────────────────────
const by = (s) => rows.filter((r) => r.status === s).length;
const success = rows.filter((r) => r.status === "Success");
const times = rows.filter((r) => typeof r.responseMs === "number").map((r) => r.responseMs);
const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

const nameCounts = {};
const uidCounts = {};
let nonSofa = 0;
for (const r of success) {
  for (const n of r.productNames) {
    nameCounts[n] = (nameCounts[n] || 0) + 1;
    if (!isSofa(n)) nonSofa++;
  }
  for (const u of r.productUids) uidCounts[u] = (uidCounts[u] || 0) + 1;
}

console.log("\n═══════════════ SUMMARY (SDK streamText × 50) ═══════════════");
console.log("Total runs           :", rows.length);
console.log("✅ Success           :", by("Success"));
console.log("⚠️  No recommendation:", by("No recommendation"));
console.log("⏱️  Timeout          :", by("Timeout"));
console.log("❌ Error             :", by("Error"));
console.log("Response time (ms)   : min", Math.min(...times), " avg", avg, " max", Math.max(...times));
console.log("\nProducts recommended :");
for (const [n, c] of Object.entries(nameCounts).sort((a, b) => b[1] - a[1])) console.log(`   ${n}: ${c}`);
console.log("Distinct UIDs        :");
for (const [u, c] of Object.entries(uidCounts).sort((a, b) => b[1] - a[1])) console.log(`   ${u}: ${c}`);
console.log("Non-sofa results     :", nonSofa);
console.log("\nSDK working fine?    :", by("Error") === 0 && by("Timeout") === 0 && by("Success") === rows.length ? "YES — 100% clean" : "See breakdown above");
console.log("\nFiles:");
console.log("  JSON  :", jsonPath.pathname);
console.log("  Ledger:", ledgerPath.pathname);
