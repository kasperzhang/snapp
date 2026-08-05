// Blind A/B eval for the design-guide models.
//
// Generates the SAME guide with two or more models from the same real scans,
// writes each output to a file with the model name stripped out, and prints a
// key at the end. The point is to read the guides without knowing which model
// wrote them — no public benchmark tells you whether a design guide is good.
//
// Run:
//   node --env-file=.env.local scripts/eval-guides.mjs                  # 6 scans, sonnet vs gemini
//   node --env-file=.env.local scripts/eval-guides.mjs --n 12
//   node --env-file=.env.local scripts/eval-guides.mjs --models claude-sonnet-5,gemini-3-flash
//
// Needs in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (to read real scans)
//   ANTHROPIC_API_KEY                                     (for claude-* models)
//   GEMINI_API_KEY                                        (for gemini-* models)
//
// Reads scans only. Writes nothing back to the database.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// ── args ─────────────────────────────────────────────────────────────────────
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const N = Number(arg("n", 6));
const MODELS = arg("models", "claude-sonnet-5,gemini-3-flash-preview").split(",");
const OUT = arg("out", "eval-output");
// --dry checks the whole setup (env, Supabase, prompt, scans) and prints what
// it *would* generate, without calling a model. Costs nothing. Run it first.
const DRY = process.argv.includes("--dry");
// Production sends 8000. Raise it to find a model's *natural* length — comparing
// a truncated guide against a complete one measures the cap, not the model.
const MAX_TOKENS = Number(arg("max-tokens", 8000));

// ── the production prompt, imported rather than copied ───────────────────────
// The prompt modules are TypeScript; pull the string out with a tiny transform
// so the eval can never drift from what the route actually sends.
async function loadGuidePrompt() {
  const src = fs.readFileSync("src/lib/ai/prompts/guide.ts", "utf8");
  const start = src.indexOf("export const STATIC_PROMPT = `");
  if (start === -1) throw new Error("STATIC_PROMPT not found in prompts/guide.ts");
  const from = src.indexOf("`", start) + 1;

  // Walk to the first unescaped closing backtick. The template contains fenced
  // code blocks, so every internal backtick is backslash-escaped — a naive
  // indexOf("`") would stop at the first one of those.
  let to = -1;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "`" && src[i - 1] !== "\\") {
      to = i;
      break;
    }
  }
  if (to === -1) throw new Error("Could not find the end of STATIC_PROMPT");

  // Un-escape what the TS template literal escapes, so the model sees the same
  // characters the route sends.
  return src.slice(from, to).replace(/\\`/g, "`").replace(/\\\$\{/g, "${");
}

// Mirrors buildContext() in src/lib/ai/prompts/guide.ts.
function buildContext(fonts, colors, url) {
  const fontList = (fonts || [])
    .map(
      (f) =>
        `- ${f.family} (weights: ${(f.weights || []).join(", ")}) - ${f.source} font, used for ${f.usage}`
    )
    .join("\n");
  const colorList = (colors || [])
    .map((c) => `- ${c.hex} (${c.context}, ${c.frequency} uses)`)
    .join("\n");
  return `<context>
Website: ${url}

**Extracted Fonts:**
${fontList || "No fonts detected"}

**Extracted Colors:**
${colorList || "No colors detected"}
</context>`;
}

// ── providers ────────────────────────────────────────────────────────────────
async function runAnthropic(model, systemText, contextText, screenshotUrl) {
  const anthropic = new Anthropic();
  const content = [
    { type: "text", text: systemText, cache_control: { type: "ephemeral" } },
    { type: "text", text: contextText },
  ];
  if (screenshotUrl) {
    content.push({ type: "text", text: "Full-page screenshot of the website:" });
    content.push({ type: "image", source: { type: "url", url: screenshotUrl } });
  }
  const t0 = Date.now();
  const msg = await anthropic.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content }],
  });
  return {
    text: msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n"),
    ms: Date.now() - t0,
    // "max_tokens" means the guide was cut off mid-sentence. That's a failure
    // regardless of how good the prose was — don't score a truncated sample.
    truncated: msg.stop_reason === "max_tokens",
    usage: {
      in: (msg.usage?.input_tokens ?? 0) +
          (msg.usage?.cache_creation_input_tokens ?? 0) +
          (msg.usage?.cache_read_input_tokens ?? 0),
      out: msg.usage?.output_tokens ?? 0,
    },
  };
}

async function runGemini(model, systemText, contextText, screenshotUrl) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set — add it to .env.local");

  const parts = [{ text: systemText }, { text: contextText }];
  if (screenshotUrl) {
    // Gemini's REST API wants image bytes inline, not a URL.
    const res = await fetch(screenshotUrl);
    if (!res.ok) throw new Error(`screenshot fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    parts.push({ text: "Full-page screenshot of the website:" });
    parts.push({
      inline_data: {
        mime_type: res.headers.get("content-type") || "image/webp",
        data: buf.toString("base64"),
      },
    });
  }

  const t0 = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          // Gemini's equivalent of thinking:{type:"disabled"} — these are
          // fill-in-the-template tasks, the format does the reasoning.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  const text = (json.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n");
  return {
    text,
    ms: Date.now() - t0,
    truncated: json.candidates?.[0]?.finishReason === "MAX_TOKENS",
    usage: {
      in: json.usageMetadata?.promptTokenCount ?? 0,
      out: json.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

const run = (model, ...rest) =>
  model.startsWith("gemini")
    ? runGemini(model, ...rest)
    : runAnthropic(model, ...rest);

// ── main ─────────────────────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n" +
      "  Run with: node --env-file=.env.local scripts/eval-guides.mjs"
  );
  process.exit(1);
}

// Verify every Gemini id exists BEFORE generating anything. Google's ids carry
// suffixes ("-preview") that change between releases, and a wrong one is a 404
// per call — without this you burn a full Anthropic run discovering the typo.
const geminiModels = MODELS.filter((m) => m.startsWith("gemini"));
if (geminiModels.length) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("✗ GEMINI_API_KEY is not set — add it to .env.local");
    process.exit(1);
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}&pageSize=200`
  );
  const json = await res.json();
  if (!res.ok) {
    console.error(`✗ Gemini key rejected: ${JSON.stringify(json.error ?? json).slice(0, 200)}`);
    process.exit(1);
  }
  const available = new Set(
    (json.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name.replace("models/", ""))
  );
  const missing = geminiModels.filter((m) => !available.has(m));
  if (missing.length) {
    console.error(`✗ Unknown Gemini model(s): ${missing.join(", ")}`);
    console.error(
      "  Available flash/pro models:\n    " +
        [...available].filter((n) => /flash|pro/.test(n) && !/embed|tts|image|audio/.test(n)).join("\n    ")
    );
    process.exit(1);
  }
}

const supabase = createClient(url, serviceKey);
const STATIC_PROMPT = await loadGuidePrompt();
console.log(`Prompt loaded (${STATIC_PROMPT.length} chars) — same bytes the route sends.\n`);

const { data: scans, error } = await supabase
  .from("site_analyses")
  .select("id, fonts, colors, screenshot_url, bookmark:bookmarks(url)")
  .eq("analysis_status", "completed")
  .not("screenshot_url", "is", null)
  .not("fonts", "is", null)
  .limit(N);

if (error) {
  console.error("✗ Could not read scans:", error.message);
  process.exit(1);
}
if (!scans?.length) {
  console.error("✗ No completed scans found. Scan a few sites in the app first.");
  process.exit(1);
}

if (DRY) {
  console.log(`Would evaluate ${scans.length} scans x ${MODELS.length} models = ` +
    `${scans.length * MODELS.length} generations -> ${OUT}/\n`);
  for (const s of scans) {
    console.log(
      `  ${(s.bookmark?.url || s.id).slice(0, 54).padEnd(56)}` +
        `${(s.fonts?.length ?? 0)} fonts, ${(s.colors?.length ?? 0)} colors, ` +
        `screenshot ${s.screenshot_url ? "ok" : "MISSING"}`
    );
  }
  const needsGemini = MODELS.some((m) => m.startsWith("gemini"));
  const needsAnthropic = MODELS.some((m) => !m.startsWith("gemini"));
  console.log("\nKeys:");
  if (needsAnthropic)
    console.log(`  ANTHROPIC_API_KEY  ${process.env.ANTHROPIC_API_KEY ? "set" : "MISSING"}`);
  if (needsGemini)
    console.log(`  GEMINI_API_KEY     ${process.env.GEMINI_API_KEY ? "set" : "MISSING"}`);
  console.log("\nLooks right? Re-run without --dry to generate.");
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
console.log(`Evaluating ${scans.length} scans x ${MODELS.length} models -> ${OUT}/\n`);

const key = [];

// Build every (scan, model) pair up front and SHUFFLE before assigning labels.
// Generating scan-by-scan meant guide-001/003/005 were always the first model
// and 002/004/006 always the second — the file number gave the answer away, so
// the "blind" read wasn't blind at all. Shuffling decouples index from model.
const jobs = [];
for (const scan of scans) {
  const site = scan.bookmark?.url || scan.id;
  const context = buildContext(scan.fonts, scan.colors, site);
  for (const model of MODELS) jobs.push({ scan, site, context, model });
}
for (let i = jobs.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [jobs[i], jobs[j]] = [jobs[j], jobs[i]];
}

let n = 0;
{
  for (const { scan, site, context, model } of jobs) {
    n += 1;
    // Opaque filename: you should not know who wrote it while reading it.
    const label = `guide-${String(n).padStart(3, "0")}`;
    process.stdout.write(`  ${label}  ${site.slice(0, 46).padEnd(48)}`);
    try {
      const r = await run(model, STATIC_PROMPT, context, scan.screenshot_url);
      fs.writeFileSync(
        path.join(OUT, `${label}.md`),
        `<!-- site: ${site} -->\n\n${r.text}\n`
      );
      key.push({
        label,
        model,
        site,
        ms: r.ms,
        ...r.usage,
        chars: r.text.length,
        truncated: r.truncated,
      });
      // No timing or token count here: 16s/3k vs 82s/8k identifies the model
      // as surely as printing its name would. Per-generation stats live in
      // _KEY.json, which you open only after reading the guides.
      console.log("ok");
    } catch (e) {
      console.log(`FAILED  ${e.message.slice(0, 80)}`);
      key.push({ label, model, site, error: e.message });
    }
  }
}

// The key goes in a separate file so it's possible to read the guides first.
key.sort((a, b) => a.label.localeCompare(b.label));
fs.writeFileSync(path.join(OUT, "_KEY.json"), JSON.stringify(key, null, 2));

console.log(`\nDone. Read ${OUT}/guide-*.md WITHOUT opening _KEY.json.`);
console.log("Score each on: template compliance, specificity (real hex/px, no hedging),");
console.log("does it match the screenshot, and is the Paste-Ready Agent Prompt usable.");
console.log(`Then open ${OUT}/_KEY.json to see which model wrote which.\n`);

for (const model of MODELS) {
  const rows = key.filter((k) => k.model === model && !k.error);
  if (!rows.length) continue;
  const avg = (f) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
  const cut = rows.filter((r) => r.truncated).length;
  console.log(
    `  ${model.padEnd(24)} ${rows.length} ok, avg ${(avg((r) => r.ms) / 1000).toFixed(1)}s, ` +
      `avg ${Math.round(avg((r) => r.out))} output tokens` +
      (cut ? `, ⚠ ${cut} TRUNCATED` : "")
  );
}
