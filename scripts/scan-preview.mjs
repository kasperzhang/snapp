// Scan one URL with the real scraper and print what it extracted, without
// touching the database. Use it to check the scanner's output on a site before
// committing to a re-scan.
//
//   node --env-file=.env.local scripts/scan-preview.mjs https://example.com
//   node --env-file=.env.local scripts/scan-preview.mjs https://example.com --save out/
//
// --save writes the captured bands as .webp so you can look at exactly what the
// model will see.

import fs from "node:fs";
import path from "node:path";

process.env.NODE_ENV ||= "development"; // use the bundled Chromium, not Sparticuz

const url = process.argv[2];
if (!url) {
  console.error("Usage: node --env-file=.env.local scripts/scan-preview.mjs <url> [--save dir]");
  process.exit(1);
}
const saveIdx = process.argv.indexOf("--save");
const saveDir = saveIdx > -1 ? process.argv[saveIdx + 1] : null;

const { analyzePage } = await import("../src/lib/scraper/page-analyzer.ts");

console.log(`Scanning ${url} …\n`);
const t0 = Date.now();
const r = await analyzePage(url);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

console.log(`SECTIONS: ${r.sections.length}`);
r.sections.forEach((b, i) =>
  console.log(`  band ${i}: ${(b.length / 1024).toFixed(0)} KB`)
);

console.log(`\nFONTS (${r.fonts.length}):`);
for (const f of r.fonts.slice(0, 6))
  console.log(`  ${f.family} — ${f.source}, ${f.usage}, weights ${f.weights.join("/")}`);

console.log(`\nCOLORS (${r.colors.length}):`);
for (const c of r.colors)
  console.log(`  ${c.hex}  ${c.context} (${c.frequency})`);

const st = r.styleTokens;
console.log(`\nBORDER RADIUS (${st.radii.length}):`);
for (const x of st.radii) console.log(`  ${x.value.padEnd(9)} ${x.context} (${x.frequency})`);

console.log(`\nSHADOWS (${st.shadows.length}):`);
for (const x of st.shadows) console.log(`  ${x.context.padEnd(8)} ${x.value.slice(0, 68)} (${x.frequency})`);

const m = st.motion;
if (m) {
  console.log(`\nMOTION — transitions (${m.transitions.length}), animations (${m.animations.length}), smooth scroll: ${m.smoothScroll}`);
  for (const t of m.transitions)
    console.log(`  ${t.value.padEnd(22)} on ${t.property} — ${t.context} (${t.frequency})`);
  for (const a of m.animations) console.log(`  anim ${a.value} (${a.frequency})`);
} else {
  console.log("\nMOTION: not measured");
}

console.log(`\nSPACING (${st.spacing.length}):`);
for (const x of st.spacing) console.log(`  ${x.value.padEnd(7)} ${x.property} (${x.frequency})`);

if (saveDir) {
  fs.mkdirSync(saveDir, { recursive: true });
  r.sections.forEach((b, i) =>
    fs.writeFileSync(path.join(saveDir, `band-${i}.webp`), b)
  );
  console.log(`\nSaved ${r.sections.length} bands to ${saveDir}/`);
}

// --guide runs the real production prompt against what we just scraped, with no
// database round-trip. Lets you check a scraper change end-to-end on any URL
// without adding a bookmark or re-scanning the library.
if (process.argv.includes("--guide")) {
  const { STATIC_PROMPT, buildContext } = await import("../src/lib/ai/prompts/guide.ts");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const model = process.argv[process.argv.indexOf("--guide") + 1]?.startsWith("--")
    ? "claude-sonnet-5"
    : process.argv[process.argv.indexOf("--guide") + 1] || "claude-sonnet-5";

  const content = [
    { type: "text", text: STATIC_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: buildContext(r.fonts, r.colors, url, r.styleTokens) },
  ];
  r.sections.forEach((band, i) => {
    content.push({
      type: "text",
      text:
        i === 0
          ? `Screenshot ${i + 1} of ${r.sections.length} — top of the page:`
          : `Screenshot ${i + 1} of ${r.sections.length} — continuing down the page:`,
    });
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/webp", data: band.toString("base64") },
    });
  });

  console.log(`\nGenerating guide with ${model} …`);
  const t1 = Date.now();
  const msg = await new Anthropic().messages.create({
    model,
    max_tokens: 12000,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  fs.mkdirSync("eval-output", { recursive: true });
  const out = `eval-output/guide-${new URL(url).hostname.replace(/\W+/g, "-")}-${model}.md`;
  fs.writeFileSync(out, `<!-- ${url} | ${model} | ${r.sections.length} sections -->\n\n${text}\n`);
  console.log(
    `  ${((Date.now() - t1) / 1000).toFixed(1)}s, ${msg.usage.output_tokens} out` +
      (msg.stop_reason === "max_tokens" ? "  ⚠ TRUNCATED" : "") +
      `\n  -> ${out}`
  );
}

process.exit(0);
