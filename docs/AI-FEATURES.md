# Snapp's AI Features — Techniques Playbook

How the two AI features are engineered, and the reasoning behind every technique —
so future changes keep (or beat) this quality bar. Snapp's goal: be the best
vibecoding helper — turn real websites a designer admires into specs an AI coding
agent can build from directly.

**The two features:**

| Feature | Route | Prompt | What it does |
|---|---|---|---|
| Design guide | `src/app/api/analysis/generate/route.ts` | `src/lib/ai/prompts/guide.ts` | One scanned site → complete design-system spec |
| Mix | `src/app/api/workbenches/generate/route.ts` | `src/lib/ai/prompts/mix.ts` | Up to 8 scanned sites + designer's picks → one cohesive combined guide |

Both are a single structured completion — no agent loop needed.

**Where things live.** The prompts were lifted out of the route files so the eval
harness (`scripts/eval-guides.mjs`) sends byte-identical bytes to what production
sends, and so a second provider can reuse them. Edit prompts in
`src/lib/ai/prompts/`, never inline in a route.

The model is no longer hardcoded at the call site. `resolveModel(feature, plan)`
in `src/lib/ai/models.ts` owns the choice, and `MODELS` there owns per-model
token pricing (metering reads it via `estimateCostCents`). The `ROUTING` table is
empty today, so everything resolves to `claude-sonnet-5` — identical to what
shipped before. That table is the one place to change when the eval picks a
cheaper model for a tier or a feature.

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

### Omission is correct; invention is a defect
Instruction #3 used to read *"Be COMPLETE — Fill every section."* Combined with
fixed component slots (Ghost/Tertiary Button, Select/Dropdown, Checkbox/Radio)
that **ordered the model to invent components the site doesn't have** — a
portfolio with no forms still got checkbox styling. It now reads "Be GROUNDED",
and each optional block says OMIT explicitly.

Measured on ramisalo.design and meetzap.app: component blocks fell 8→5 and 8→3,
with every omission verified against the scraper as genuinely absent, and output
fell ~7.5%.

Two honest caveats, so nobody re-litigates this from the changelog alone:
- **This did not measurably improve the generated pages.** The motivating theory
  was that over-specification constrains the downstream coding agent. It doesn't
  appear to — Claude Design ignored the invented components entirely (zero
  `<select>` in any output, BASE or tightened). The change shipped for cost and
  factual correctness, which were measured; not for page quality, which was a
  wash.
- **Run-to-run variance of the downstream agent exceeds this effect size.** Two
  runs of the *same* condition differed more than the two conditions differed.
  Don't try to A/B prompt tweaks through rendered pages without many samples per
  cell; the noise floor will eat the signal.

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

### Mix sees everything; the tags decide what it borrows
The Mix used to send only the fonts and colours a designer had ticked, one
screenshot band per source, and no measured DOM tokens at all — while the
single-site route sent the full extracted lists, every band, and the measured
radii/shadows/spacing marked as facts. Same site through both produced very
different guides: the single-site one specified the site's real accent and its
five-step neutral ramp, the Mix invented an accent and reached for Tailwind's
default gray. It wasn't a worse prompt, it was a starved one.

Now every source carries its full measured evidence, with the designer's picks
marked `← designer picked this`. The distinction that matters: **tags decide
what to BORROW, never what the model is allowed to KNOW.** An untagged source
contributes its overall feel — it should still be described accurately.

Screenshot bands scale with source count (3 each at ≤2 sources, hero only
beyond) so an eight-source mix still fits in one request.

### The type scale is measured, not read off a picture
Font families were the only typography evidence a guide ever had — no sizes, no
line heights, no tracking — so every "display 56–64px/1.05, body 16–18px/1.5,
tracking -0.02em" was inferred from a screenshot. Against anthropic.com those
guesses had the tracking on the wrong role (measured: `-0.02em` on body, headings
normal) and the body size out by 4–6px.

Sizes now come off the live DOM, from elements that actually render text, with
two rules that matter:

- **Roles by ratio, not by tag.** Modern sites set their biggest statement in a
  div, so tag names alone reported a 58px 700-weight headline as "body" — true to
  the markup and useless as a spec. The most-used size becomes the base and
  everything is placed against it.
- **Capped per role *and* family.** A site whose serif carries one paragraph and
  whose sans carries everything else would otherwise lose the serif entirely to
  crowded sans slots, and a second typeface is one of the most consequential
  facts about a design.

`ExtractedFont.usage` is derived from the scale too, weighted by frequency: a
workhorse sans that also sets the one huge headline is still the body face.

### Motion is measured, not imagined
A screenshot is one moment, so nothing about timing is visible in it — which made
Motion & Effects the most confidently invented section in both guides. They handed
over easing curves and millisecond values with nothing behind them; one of them
even said so ("no motion is directly observable in static screenshots, but…").

The scanner now reads it off the live page: `transition-duration` /
`-timing-function` / `-property` from computed styles, frequency-ranked like
radii, plus every animation seen through `document.getAnimations()`. Two details
make it work:

- **Capture runs under `prefers-reduced-motion: reduce`** so screenshots aren't
  caught mid-reveal. A site that honours the preference zeroes its own
  transitions under it, so the emulation is switched off before measuring —
  otherwise we would faithfully record that the design has no motion.
- **`finishAnimations()` destroys the evidence**, and it runs repeatedly through
  the scroll-through. Each animation is recorded *before* it is frozen, which is
  the only moment a scroll-triggered reveal is observable — by extraction time
  they have all finished and left `getAnimations()`. This is what makes Framer
  and GSAP sites measurable at all.

Known limit: a site whose JS reads `prefers-reduced-motion` once at init won't
animate during capture no matter what we flip afterwards, so JS-driven motion can
still be under-reported. Under-reporting is the safe direction — the prompt says
to state that a design animates nothing rather than invent a timing scale.

### Source attribution requirement
Mix requires decisions be attributed ("headings follow Site A; the accent comes
from Site B") and conflicts resolved *with stated reasoning*. This forces genuine
synthesis instead of a list of quotes, and lets the designer trace every decision
back to their own picks.

**Provenance, not mechanism.** Naming the site a decision came from is the useful
half; describing how the guide was commissioned is not. A real output read *"Do not
introduce Granola's Quadrant/Melange faces — Granola is tagged for color/layout
only"*, which is snapp's own vocabulary leaking into an artifact whose reader is an
agent that has never heard of a tag. The prompt now asks for the first and forbids
the second, and keeps source names out of Design Tokens entirely — that half is
machine-read.

### The vibecoding payoff: the document *is* the prompt
Both guides open with one normative line under the title — "Build to this spec.
Every value below is normative; where it is silent, choose the option most
consistent with the Design Philosophy." — and end with **Design Tokens**, the
decisions rendered as CSS variables plus a couple of component snippets. Paste the
whole thing into Claude Code / Cursor / v0 and it's the first prompt of a
vibecoding session.

This replaced a closing **"Paste-Ready Agent Prompt"** block (~200 words, written
as direct commands) and a **Quick Reference** cheat-sheet. Both were removed on
purpose, and re-adding either is a regression:

- They restated decisions already made above, so a drifting model could produce a
  summary that contradicts the body — two sources of truth in one document.
- The paste-ready block was a lossy compression of a guide the reader already had
  in full, and nothing marked what it had dropped.
- Being last, it was what truncation ate first (see `max_tokens` below).

**What This Design Is NOT** is the one negative section worth its tokens, ported
from the single-site template. A negative constraint earns its place only when it
contradicts a prior the model would otherwise follow — decorative gradients, an
all-purpose rounded corner, a default blue button — so the spec requires the form
"Not X — Y instead", caps it at five lines, and rejects any line that could appear
in any other guide ("not a generic template" says nothing). It must be derivable
from the decisions above it: like Design Tokens, it resolves what they leave open
and never introduces anything new.

Design Tokens survives the cut because it is a *translation*, not a restatement:
`--accent: #D4F547` is a value an agent applies without interpreting, which is
what makes two runs of the same guide land the same way. It must never introduce a
decision that isn't already stated in prose above it.

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

### `max_tokens: 12000` — measured, not guessed
Was 8000. Across six real sites Sonnet's natural length for this template is
**7,700–8,500 tokens**, so an 8000 cap sat exactly on the model's output length
and truncated roughly half of all guides — usually severing the closing section.
(Those two closing sections have since been cut, so natural length is ~1,500-2,000
tokens shorter; the cap stays at 12000 because a cap costs nothing unspent and
truncation is the expensive failure.) At ~85s per 8,000 tokens, 12000
lands near 120s, well inside the 300s ceiling. `scripts/eval-guides.mjs` reports
`⚠ TRUNCATED` per generation; if that starts appearing again, tighten the
output-format skeleton rather than raising the cap further.

### The original reasoning (kept — it still bounds the ceiling)
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
inflation of the request, and Anthropic fetches them directly. Note this is
Anthropic-specific: Gemini's REST API wants inline base64, which is why the eval
harness fetches the image itself before calling it.

Screenshots are **WebP q80 at 1280×800** (`src/lib/scraper/page-analyzer.ts`) —
about 120KB versus ~800KB for the PNG they used to be. Storage is the dominant
Supabase cost and screenshots are never re-generated, so the format choice
compounds. Both Anthropic and Gemini accept `image/webp`.

### Sectioned capture, not one tall image
The page is captured as up to `MAX_SCREENSHOT_SECTIONS` (3) consecutive
viewport-height bands, hero first, each sent as its own labelled image. A single
`fullPage: true` capture gets downsampled to ~1568px on the long edge by the
model APIs, so a 6000px page arrives as unreadable mush. Bands stay sharp.
`screenshot_url` remains the hero (bookmark previews, Mix); `screenshot_urls`
holds the full ordered set.

### Animations are finished, not outwaited
Scroll-reveal choreography is the norm now — text fading in word by word, cards
rising into place. Capturing a fixed delay after scrolling photographs those
mid-flight: on nexola.framer.website a band caught "Nexola® is a *digital*"
with the rest of the sentence still transparent. Two harms, not one — the model
can't read the copy, and the transient mid-fade greys land in the extracted
palette as if they were brand colours.

Three guards, in order of how much they buy:

1. **`prefers-reduced-motion: reduce`** is emulated before navigation. Sites
   that honour it (Framer and Webflow output do by default) render straight to
   the final state, removing the race rather than trying to outwait it.
2. **`finishAnimations()`** snaps every in-flight animation to its end state
   after each scroll. It uses `document.getAnimations()`, which covers CSS
   animations, CSS transitions *and* the Web Animations API — the last is what
   Framer and GSAP drive reveals through, so a CSS-only override would miss
   them. Infinite animations (spinners, marquees) are skipped: `finish()`
   throws on them, and they look the same at any moment anyway.
3. **`document.fonts.ready`** is awaited before the first capture. Webfonts
   render as fallback — or as nothing under `font-display: block` — until
   loaded, and typography is the thing we're most here to read.

Cost: roughly +3s per scan (6s → 9s). Immaterial next to a $0.0006 scan, and
well inside the 60s route ceiling.

### Measured tokens beat inferred ones
`extractStyleTokensFromPage` reads **border-radius, box-shadow and the spacing
rhythm** off the live DOM, and `buildContext` presents them as facts the model
must copy verbatim.

This closed a real failure: the template has always demanded Border Radius,
Shadows and a Spacing Scale, but the scraper only ever produced fonts and
colours — so the model invented all three from one above-the-fold screenshot. A
site whose cards, buttons and inputs are all rounded got documented as
`border-radius: 0px`, because no rounded component was visible in the one image
it had. Every model tested made this class of error; it was an input problem,
not a model problem.

Two details worth preserving if you touch that extractor:
- **0px radius is deliberately not counted.** It's the CSS default, so every
  icon and wrapper div votes for it and buries the handful of real decisions.
  An empty `radii` list already means "nothing is rounded".
- **Hidden and sub-8px elements are filtered out** before counting, or the
  frequency ranking reflects the DOM rather than the design.

Analyses scanned before this shipped have `style_tokens = null`; `buildContext`
omits the block entirely rather than asserting anything, so they degrade to
exactly the old behaviour until re-scanned.

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
- [ ] Paste the whole guide into Claude Code yourself and see if the result
      resembles the source site. Don't reintroduce a summary or a paste-ready
      block to make that easier — see "the document *is* the prompt" above.
