# Snapp's AI Features — Techniques Playbook

How the two AI features are engineered, and the reasoning behind every technique —
so future changes keep (or beat) this quality bar. Snapp's goal: be the best
vibecoding helper — turn real websites a designer admires into specs an AI coding
agent can build from directly.

**The two features:**

| Feature | Route | What it does |
|---|---|---|
| Design guide | `src/app/api/analysis/generate/route.ts` | One scanned site → complete design-system spec |
| Mix | `src/app/api/workbenches/generate/route.ts` | Up to 8 scanned sites + designer's picks → one cohesive combined guide |

Both call `claude-sonnet-5` via `anthropic.messages.create` — a single structured
completion, no agent loop needed.

---

## 1. Prompt-engineering techniques

### XML-tagged prompt structure
Prompts are segmented into `<role>`, `<task>`, `<output-format>`, `<instructions>`
blocks. Claude is trained to respect these boundaries; it keeps a 4K-token prompt
from bleeding sections together and makes each part independently editable.

### Detailed role prompting
The role is specific ("design system architecture, type scales, color theory,
Tailwind implementation"), not generic ("you are a helpful designer"). It names the
*audience* too: AI design tools, AI coding assistants, human developers. The model
calibrates precision to who will consume the output.

### Output format as a fill-in contract
The `<output-format>` block is a complete Markdown skeleton with `[placeholder]`
slots — not a description of what to write, but the literal document with holes.
This is the highest-leverage technique in the codebase: it makes output structure
deterministic (the UI can rely on section headings), forces completeness (every
placeholder demands a value), and doubles as documentation of what the feature
produces. Sonnet 5 follows instructions *literally*, which makes template
compliance near-perfect.

### Opinionated-and-specific directives
"Be OPINIONATED — never hedge", "exact hex codes, not ranges", "copy-paste ready".
Without these, models default to hedged, generic design advice ("consider a
sans-serif font"). Naming the failure mode ("What This Design Is NOT",
anti-pattern lists) steers away from AI-slop genericness better than positive
instructions alone.

### No-preamble via instruction (not prefill)
Both prompts end with "Output ONLY the Markdown document, begin directly with the
H1". On older Claude models you'd force this with an assistant prefill
(`{"role": "assistant", "content": "# Design Style:"}`) — **that returns a 400 on
claude-sonnet-5**. Prefills are gone; explicit output instructions are the
replacement, and Sonnet 5's literal instruction-following makes them reliable.

### Vision grounding: screenshot > tokens
Both features attach full-page screenshots as `{"type": "image", "source":
{"type": "url", ...}}` blocks, with an explicit precedence rule: *"the screenshot
is the primary source of truth; extracted tokens are supporting evidence; where
they conflict, trust the screenshot."* Scraped font/color tokens can't capture
layout, spacing rhythm, imagery, or feel — the screenshot can. Precedence matters
because scrapers pick up noise (ad colors, fallback fonts) that the model should
override from what it sees.

### Interleaved text + image (Mix)
Mix doesn't dump 8 screenshots then 8 descriptions. It interleaves: source-1 text
(picked aspects, fonts, colors, designer note) → source-1 screenshot → source-2
text → … This binds each image to its metadata and per-source borrowing
instructions ("borrow only the marked aspects; ignore the rest of that site").

### Source attribution requirement
Mix requires decisions be attributed ("headings follow Site A; the accent comes
from Site B") and conflicts resolved *with stated reasoning*. This forces genuine
synthesis instead of a list of quotes, and lets the designer trace every decision
back to their own picks.

### The vibecoding payoff: Paste-Ready Agent Prompt
Both guides end with a **"Paste-Ready Agent Prompt"** section — a self-contained
~200-word fenced block written as direct commands, designed to be pasted verbatim
into Claude Code / Cursor / v0. The full guide is the reference; this block is the
action. It's what turns Snapp output from "documentation" into "the first prompt
of a vibecoding session." Keep it self-contained: it must work without the rest of
the document.

---

## 2. API techniques

### Prompt caching with a stable prefix
Anthropic's cache is a **byte-exact prefix match**. The single-page route
originally interpolated per-site data *before* the static template — so its
`cache_control` never produced a hit. The fix: static instructions first (one
cached text block, ~4K tokens, well above the ~2K minimum cacheable prefix), then
dynamic context as separate blocks after the breakpoint. Repeat generations within
the 5-minute TTL now read the template at ~0.1× input price.
The Mix `LEAD` prompt (~1K tokens) sits *below* the cacheable minimum — a
`cache_control` marker there would silently no-op, so it doesn't carry one.

### `max_tokens: 8000` as a timeout guarantee
Vercel kills the function at `maxDuration = 300` (the plan ceiling), and a killed
function skips the error handler — stranding `guide_status` at `"generating"`
forever. At worst-case output speed, 8,000 tokens ≈ 2 minutes, so the timeout is
mathematically unreachable; 16,000 could brush it. A complete guide fits
comfortably in 8K. **If output ever hits `stop_reason: "max_tokens"`, tighten the
format before raising the cap.**

### Thinking disabled deliberately
Sonnet 5 runs *adaptive thinking by default when the `thinking` param is omitted* —
thinking tokens count against `max_tokens` and add latency toward the timeout.
These are fill-in-the-template tasks where the format does the reasoning, so both
routes set `thinking: {type: "disabled"}` explicitly. If quality ever needs a
boost, the next step is `thinking: {type: "adaptive"}` + `output_config: {effort:
"low"}` — and re-checking the token/timeout budget.

### Vision via URL image blocks
Screenshots pass as URL-type image sources (Supabase storage URLs) — no base64
inflation of the request, and Anthropic fetches them directly.

### Real usage metering
Billing uses `message.usage` (actual token counts) — `totalInputTokens(usage)` +
`output_tokens` → `estimateCostCents(MODEL, usage)` — never estimates. Cached
input tokens are billed at their discounted rate in `plans.ts`.

### Guardrails around every call
In order, before the API is touched: auth (Supabase session) → ownership check on
the resource → per-user in-memory rate limit (guards runaway loops) → monthly plan
cap with a 402 + upgrade nudge → input validation (Mix: at least one *scanned*
source; sources capped at `MAX_GUIDE_SOURCES = 8` to bound per-call cost). More
sites ≈ more input images, but generation time is dominated by *output* length —
which is why the source cap plus the output cap together bound both cost and time.

---

## 3. Considered and rejected (and why)

| Idea | Verdict |
|---|---|
| **Anthropic Agent Skills** (`container.skills`) | Not applicable — Skills run in code-execution containers for file-producing workflows (.pptx, .xlsx). Snapp's generation is a single structured completion; the "skill" equivalent here is the versioned prompt template in code, which also keeps caching effective. |
| **Assistant prefill** to force the H1 opening | 400s on claude-sonnet-5. Replaced by explicit output-only instructions. |
| **Agent loop / tool use** | Overkill — there's no decision-making between steps; scan data is gathered before the call. |
| **Higher `maxDuration`** | 300s is the plan ceiling; the right fix was bounding output, not buying time. |

### Adopted since: streaming

The combined-guide route now streams (`anthropic.messages.stream`). It was
listed here as "worth doing later" while generation was a single blocking
call; a minute of frozen skeleton was the worst part of the flow, so the Mix
panel now renders the guide as it is written.

Two consequences worth remembering when editing the route:

- **Usage metering must stay after `finalMessage()`.** Token counts aren't
  final until the stream ends, so `recordUsage` runs after the delta loop —
  not alongside the request.
- **Failures after the first byte can't be an HTTP status.** Every pre-flight
  check (auth, rate limit, plan cap) still answers with plain JSON *before*
  the stream opens; anything that fails later rides an in-band `err` frame,
  and the stream is closed rather than errored so the client can read the
  message.

`max_tokens: 8000` still stands, but the reason changed: it now bounds cost
and output length rather than protecting against the Vercel timeout, which
streaming largely defuses.

---

## 4. Checklist for future prompt changes

- [ ] Keep the static template byte-identical across requests — any interpolation
      into it kills the cache. Dynamic data goes in blocks *after* the breakpoint.
- [ ] Every new output section goes in the `<output-format>` skeleton with
      `[placeholders]`, not prose instructions.
- [ ] State precedence when adding new evidence sources (what wins on conflict).
- [ ] Re-check the token budget: template growth + expected output must stay well
      under `max_tokens`, and `max_tokens` × worst-case tokens/sec under 300s.
- [ ] Test with a noisy real site (marketing page with ads/trackers), not just
      clean portfolio sites — that's where "trust the screenshot" earns its keep.
- [ ] The Paste-Ready Agent Prompt must remain self-contained; paste it into
      Claude Code yourself and see if the result resembles the source site.
