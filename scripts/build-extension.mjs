// Pack extension/ into a Chrome Web Store upload.
//
//   node scripts/build-extension.mjs
//
// Writes dist/extension/ and dist/snapp-extension-<version>.zip.
//
// The one job beyond zipping is removing localhost. The source has to treat
// localhost as Snapp so the thing is testable against a dev server, but a
// published build must not: everyone who installs this runs their own local
// servers, and matching them would inject content scripts into unrelated local
// apps and strip CSP from their iframes. That's both a real privacy problem and
// the kind of thing store review rejects.
//
// Every removal is verified at the end — the build fails loudly rather than
// shipping a localhost match nobody noticed.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SRC = "extension";
const OUT = "dist/extension";
const ZIP_DIR = "dist";

// Copied verbatim; anything not listed is left out of the upload.
const FILES = [
  "manifest.json",
  "background.js",
  "announce.js",
  "origin-report.js",
  "rules/frame_headers.json",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

const isLocalhost = (s) => typeof s === "string" && s.includes("localhost");

fs.rmSync("dist", { recursive: true, force: true });

for (const rel of FILES) {
  const from = path.join(SRC, rel);
  if (!fs.existsSync(from)) throw new Error(`Missing ${from}`);
  const to = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// ── manifest: drop localhost from every match list ──────────────────────────
const manifestPath = path.join(OUT, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

for (const script of manifest.content_scripts ?? []) {
  script.matches = script.matches.filter((m) => !isLocalhost(m));
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// ── DNR rules: drop localhost as an allowed frame initiator ─────────────────
const rulesPath = path.join(OUT, "rules/frame_headers.json");
const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));

for (const rule of rules) {
  const domains = rule.condition?.initiatorDomains;
  if (domains) {
    rule.condition.initiatorDomains = domains.filter((d) => !isLocalhost(d));
  }
}
fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2) + "\n");

// ── background.js: empty the dev pattern list ───────────────────────────────
const bgPath = path.join(OUT, "background.js");
const bgSrc = fs.readFileSync(bgPath, "utf8");
const DEV_LINE = /const DEV_PATTERNS = \[[^\]]*\];/;
if (!DEV_LINE.test(bgSrc)) {
  throw new Error(
    "background.js: couldn't find `const DEV_PATTERNS = [...];` to strip. " +
      "If it was renamed or reformatted, update this script — do not ship as is."
  );
}
fs.writeFileSync(bgPath, bgSrc.replace(DEV_LINE, "const DEV_PATTERNS = [];"));

// ── verify, then zip ────────────────────────────────────────────────────────
/* Comments are allowed to say "localhost" — they explain why it isn't here.
   Only code counts, so strip comments before looking. Blanking them rather
   than deleting keeps line numbers honest in the report below. */
function stripComments(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const offenders = [];
for (const rel of FILES) {
  if (!/\.(json|js)$/.test(rel)) continue;
  const raw = fs.readFileSync(path.join(OUT, rel), "utf8");
  const code = rel.endsWith(".js") ? stripComments(raw) : raw;
  code.split("\n").forEach((line, i) => {
    if (isLocalhost(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
  });
}
if (offenders.length) {
  console.error("localhost survived the build:\n  " + offenders.join("\n  "));
  process.exit(1);
}

const zipName = `snapp-extension-${manifest.version}.zip`;
execFileSync("zip", ["-r", "-q", path.join("..", zipName), "."], {
  cwd: OUT,
});

const { size } = fs.statSync(path.join(ZIP_DIR, zipName));
console.log(`${ZIP_DIR}/${zipName}  (${(size / 1024).toFixed(1)} KB)`);
console.log(`v${manifest.version} — ${manifest.name}`);
console.log(`permissions: ${manifest.permissions.join(", ")}`);
console.log(
  `host_permissions: ${(manifest.host_permissions ?? []).join(", ")}`
);
console.log("localhost: removed and verified absent");
