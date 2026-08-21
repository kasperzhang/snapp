// Show exactly what a Mix sends the model — text and images, in order.
//
// A guide is only as good as its evidence, and until now that evidence was
// invisible: you could read the output and guess, but you could not see the
// screenshots the model actually looked at or the measurements it was handed.
// This renders the real payload as a page — every text block and every image,
// interleaved in the order the API receives them.
//
// Run:
//   node --import ./scripts/ts-alias-register.mjs --env-file=.env.local \
//     scripts/inspect-mix.mjs <workbench-id>
//   … --open          also opens the page in your browser
//   … --list          just list your mixes and their ids, then exit
//
// Needs in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Reads only. Calls no model, spends no credit, writes nothing to the database.

import fs from "node:fs";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { LEAD, sourceText } from "@/lib/ai/prompts/mix";
import { MAX_GUIDE_SOURCES } from "@/lib/billing/plans";

const args = process.argv.slice(2);
const LIST = args.includes("--list");
const OPEN = args.includes("--open");
const OUT = "mix-payload.html";
const id = args.find((a) => !a.startsWith("--"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --import ./scripts/ts-alias-register.mjs --env-file=.env.local scripts/inspect-mix.mjs <id>"
  );
  process.exit(1);
}
const db = createClient(url, key);

if (LIST || !id) {
  const { data, error } = await db
    .from("workbenches")
    .select("id, name, guide_status, updated_at, workbench_items(count)")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  console.log("\nYour mixes (newest first):\n");
  for (const w of data) {
    const n = w.workbench_items?.[0]?.count ?? 0;
    console.log(
      `  ${w.id}  ${String(n).padStart(2)} src  ${(w.guide_status ?? "idle").padEnd(10)}  ${w.name}`
    );
  }
  console.log(`\nThen: node --import ./scripts/ts-alias-register.mjs --env-file=.env.local scripts/inspect-mix.mjs <id>\n`);
  process.exit(0);
}

// ── the same query the route runs ────────────────────────────────────────────
const { data: wb, error } = await db
  .from("workbenches")
  .select(
    "*, items:workbench_items(*, bookmark:bookmarks(url,title), analysis:site_analyses(fonts,colors,style_tokens,screenshot_url,screenshot_urls,analysis_status))"
  )
  .eq("id", id)
  .single();
if (error) throw error;

const raw = [...(wb.items ?? [])].sort((a, b) => a.position - b.position);
const ready = raw
  .filter((it) => it.analysis?.screenshot_url)
  .map((it, i) => ({
    index: i + 1,
    title: it.bookmark?.title || "Untitled",
    url: it.bookmark?.url || "",
    selection: it.selection,
    fonts: it.analysis?.fonts || [],
    colors: it.analysis?.colors || [],
    styleTokens: it.analysis?.style_tokens ?? null,
    screenshotUrl: it.analysis.screenshot_url,
    screenshotUrls: it.analysis?.screenshot_urls?.length
      ? it.analysis.screenshot_urls
      : [it.analysis.screenshot_url],
  }));
const sources = ready.slice(0, MAX_GUIDE_SOURCES);

// Mirrors the route: small mixes get the whole scroll, large ones the hero.
const bandsPerSource = sources.length <= 2 ? 3 : 1;

// ── rebuild the content array the route would send ───────────────────────────
const blocks = [{ kind: "text", label: "LEAD (the prompt)", text: LEAD }];
for (const item of sources) {
  blocks.push({
    kind: "text",
    label: `Source ${item.index} — ${item.title}`,
    text: sourceText(item),
  });
  const bands = item.screenshotUrls.slice(0, bandsPerSource);
  bands.forEach((u, i) => {
    if (bands.length > 1) {
      blocks.push({
        kind: "text",
        label: "band label",
        text:
          i === 0
            ? `Screenshot 1 of ${bands.length} — top of the page:`
            : `Screenshot ${i + 1} of ${bands.length} — continuing down:`,
      });
    }
    blocks.push({ kind: "image", label: `${item.title} — band ${i + 1}`, url: u });
  });
}
if (wb.own_additions?.trim()) {
  blocks.push({
    kind: "text",
    label: "Your own additions",
    text: `## Designer's own additions\n${wb.own_additions.trim()}`,
  });
}
blocks.push({
  kind: "text",
  label: "closing instruction",
  text: "Now write the combined design guide following the output format exactly.",
});

// ── report ───────────────────────────────────────────────────────────────────
const images = blocks.filter((b) => b.kind === "image").length;
const chars = blocks.reduce((n, b) => n + (b.text?.length ?? 0), 0);
console.log(`\n  ${wb.name}`);
console.log(`  ${sources.length} source(s), ${bandsPerSource} band(s) each → ${images} images`);
console.log(`  ${chars.toLocaleString()} characters of text (~${Math.round(chars / 4).toLocaleString()} tokens, images extra)`);
if (raw.length > sources.length) {
  console.log(`  ⚠ ${raw.length - sources.length} source(s) dropped: unscanned, or past the ${MAX_GUIDE_SOURCES}-source cap`);
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

fs.writeFileSync(
  OUT,
  `<!doctype html><meta charset="utf-8"><title>Mix payload — ${esc(wb.name)}</title>
<style>
 body{background:#FBFAF7;color:#221C15;font:14px/1.6 ui-sans-serif,system-ui;margin:0;padding:40px}
 .wrap{max-width:900px;margin:0 auto}
 h1{font-size:22px;margin:0 0 4px} .sub{color:#5C5346;margin:0 0 28px}
 .b{margin:0 0 18px;border:1px solid #E7E1D5;border-radius:12px;overflow:hidden;background:#fff}
 .h{display:flex;gap:8px;align-items:baseline;padding:9px 13px;background:#F6F3EC;border-bottom:1px solid #E7E1D5;
    font:11px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#8D6F4C}
 .h b{color:#221C15;font-weight:600;letter-spacing:0}
 pre{margin:0;padding:14px 16px;white-space:pre-wrap;word-break:break-word;font:12.5px/1.65 ui-monospace,monospace}
 img{display:block;width:100%}
 .n{margin-left:auto;color:#9C927F;letter-spacing:0}
</style>
<div class="wrap">
<h1>${esc(wb.name)}</h1>
<p class="sub">${sources.length} source(s) · ${images} images · ~${Math.round(chars / 4).toLocaleString()} text tokens · in the order the model receives them</p>
${blocks
  .map(
    (b, i) => `<div class="b"><div class="h">${String(i + 1).padStart(2, "0")} · ${
      b.kind
    } <b>${esc(b.label)}</b><span class="n">${
      b.kind === "image" ? "image" : `${b.text.length} chars`
    }</span></div>${
      b.kind === "image"
        ? `<img src="${b.url}" alt="${esc(b.label)}">`
        : `<pre>${esc(b.text)}</pre>`
    }</div>`
  )
  .join("\n")}
</div>`
);

console.log(`\n  Wrote ${OUT} — open it to see every block and screenshot in order.\n`);
if (OPEN) execSync(`open ${OUT}`);
