import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/ui/Logo";
import { MarketingShell } from "./_shell/MarketingShell";
import { PricingPlans } from "./_shell/PricingPlans";
import { CopyGuideButton } from "./_shell/CopyGuideButton";
import { TOOL_MARKS } from "@/components/marketing/ToolLogos";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────────
   snapp landing — "the annotated screenshot"

   One idea carries the page: a large, believable screenshot of the app doing
   its real job (library → borrow chips → guide), marked up like a designer's
   moodboard. Warm tones belong to the human/taste side; the single cool blue
   belongs to the agent/code side. The footer prints this page's own guide.
   ──────────────────────────────────────────────────────────────────────────── */

// The twelve borrowable aspects (mirrors DESIGN_ASPECTS in src/types).
const ASPECTS: { label: string; hue: string }[] = [
  { label: "Typography", hue: "#221C15" },
  { label: "Color", hue: "#C25E6A" },
  { label: "Background", hue: "#D9962F" },
  { label: "Layout", hue: "#4C6B9A" },
  { label: "Spacing", hue: "#8A8578" },
  { label: "Components", hue: "#77609C" },
  { label: "Depth & Shape", hue: "#48887B" },
  { label: "Animation", hue: "#D9962F" },
  { label: "Motion & Scroll", hue: "#4C6B9A" },
  { label: "Imagery", hue: "#C25E6A" },
  { label: "Iconography", hue: "#77609C" },
  { label: "Vibe", hue: "#48887B" },
];

/* Rendered on the page and emitted as FAQPage JSON-LD from this one source. */
const FAQS = [
  {
    q: "Which coding tools does this work with?",
    a: "Any of them. The output is a Markdown document — hex values, font stacks, spacing scale, component notes — so it pastes into Cursor, Claude Code, v0, Lovable, Bolt, or straight into a CLAUDE.md or cursorrules file.",
  },
  {
    q: "Is this a website cloner?",
    a: "No. You tag which aspects to borrow from each site — this one's typography, that one's colour, another's motion — and snapp fuses only those into one original system. Nothing is copied wholesale, and the result is a spec, not markup.",
  },
  {
    q: "What do I get for free?",
    a: "The whole library: unlimited bookmarks, visual previews, tags, search, and 15 site scans a month. It stays free. You also get one design guide so you can see what the output looks like — after that, Lite is $3.99/month for ten a month and Pro is $9.99 for forty.",
  },
  {
    q: "How is this different from a bookmark manager?",
    a: "A bookmark manager gives you the link back. snapp reads the site — its fonts, its palette, a full screenshot — and turns a set of them into something your coding agent can act on.",
  },
  {
    q: "Do I need to know design terms?",
    a: "No. You point at sites you like and tick what appeals — typography, colour, spacing, the way it scrolls. Naming the thing is snapp's job.",
  },
  {
    q: "What does the guide actually contain?",
    a: "A design philosophy, typography with real font stacks, a colour section with hex values and roles, layout and spacing, components, motion, imagery, and a design-token block — CSS variables and component snippets your agent can apply without interpreting. The whole document is the prompt: paste it in as it is.",
  },
];

/* The four moves a designer already makes when starting something new. snapp
   doesn't add a step — it picks up at the point where the references usually
   get lost. */
const PHASES = [
  {
    n: "01",
    verb: "Browse",
    line: "You trawl the web like always — a studio site, a competitor, that one landing page you keep reopening.",
  },
  {
    n: "02",
    verb: "Save",
    line: "One click from the extension, or paste the URL. snapp keeps the preview, the favicon, and reads the fonts and colours behind it.",
  },
  {
    n: "03",
    verb: "Borrow",
    line: "Tag what each one gets right. This one's type, that one's palette, a third one's scroll.",
  },
  {
    n: "04",
    verb: "Guide",
    line: "One spec into your agent — hex values, font stacks, spacing, motion — instead of forty prompts.",
  },
];

export default async function LandingPage() {
  const posts = getAllPosts().slice(0, 3);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;
  const appHref = loggedIn ? "/app" : "/signup";
  // Pricing CTAs go where the plan can actually be bought. Sending a signed-in
  // visitor who clicked "Go Pro" to /app just drops them in the product with no
  // way to pay — Settings is where the plan buttons live.
  const planHref = loggedIn ? "/settings?tab=plan" : "/signup";

  // Emitted from the same array the section renders, so the structured data
  // can't drift from what's actually on the page — which is what earns the
  // rich result rather than a manual-mismatch penalty.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />


      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="lp-hero">
        <p className="lp-eyebrow lp-rise">
          For people building with Cursor, Claude Code, v0 and Lovable
        </p>
        <h1 className="lp-h1 lp-rise lp-d1">
          Your agent writes the code.
          <br />
          You bring the <span className="lp-that">taste</span>.
        </h1>
        <p className="lp-hero-sub lp-rise lp-d2">
          Keep the sites you wish you&apos;d made. Tag what to borrow from each —
          this type, that palette, the way it scrolls — and snapp writes one
          design guide your agent actually follows.
        </p>
        <div className="lp-hero-ctas lp-rise lp-d3">
          <Link href={appHref} className="lp-btn lp-btn-primary">
            {loggedIn ? "Open snapp" : "Start saving free"}
          </Link>
          <a href="#mix" className="lp-btn lp-btn-ghost">
            See the Mix
          </a>
        </div>
        <p className="lp-hero-note lp-rise lp-d3">
          Free forever for bookmarking · No card required
        </p>
      </section>

      {/* ── The screenshot ───────────────────────────────────── */}
      <section className="lp-shot-wrap" aria-label="The snapp app">
        <div className="lp-shot lp-rise lp-d4">
          <span className="lp-note lp-note-borrow" aria-hidden>
            tag what to borrow ↓
          </span>
          <span className="lp-note lp-note-guide" aria-hidden>
            one guide, three sites →
          </span>
          <AppMockup />
        </div>
        <div className="lp-agents">
          <span>Paste the guide into</span>
          <span className="lp-tools">
            {TOOL_MARKS.map(({ name, Mark }) => (
              <span key={name} className="lp-tool" title={name}>
                <Mark className="lp-tool-mark" />
                {name}
              </span>
            ))}
          </span>
        </div>
      </section>

      {/* ── Mix (pro) ──────────────────────────────────── */}
      <section id="mix" className="lp-section lp-section-tint">
        <div className="lp-section-inner">
          <div className="lp-wb-head">
            <p className="lp-eyebrow">
              The Mix <span className="lp-pro-tag">Pro</span>
            </p>
            <h2 className="lp-h2">
              You can see it. Your agent can&apos;t. That&apos;s the whole problem.
            </h2>
            <p className="lp-body">
              Vibe coding dies at &ldquo;make it look better.&rdquo; You know exactly
              which sites you mean — you just can&apos;t type it. So don&apos;t
              describe. Point: pick bookmarks, tag what to borrow from each one, and
              snapp writes the spec.
            </p>
          </div>
          <div className="lp-cols lp-cols-wb">
            <div className="lp-col-visual">
              <BorrowVignette />
            </div>
            <div className="lp-col-copy">
              <h3 className="lp-h3">Twelve things you can borrow from any site.</h3>
              <p className="lp-body">
                Every site is a menu, not a template. Take one dish — a typeface, a
                gradient, the way it scrolls — and leave the rest. snapp only pulls
                what you tag, so the result is yours, not a clone.
              </p>
              <div className="lp-aspects">
                {ASPECTS.map((a) => (
                  <span key={a.label} className="lp-aspect">
                    <i style={{ background: a.hue }} />
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The guide (dark) ─────────────────────────────────── */}
      <section className="lp-dark">
        <div className="lp-section-inner lp-cols">
          <div className="lp-col-copy">
            <p className="lp-eyebrow lp-eyebrow-dark">The output</p>
            <h2 className="lp-h2 lp-h2-dark">One guide instead of forty prompts.</h2>
            <p className="lp-body lp-body-dark">
              What comes out isn&apos;t a moodboard — it&apos;s a working document:
              hex values, font pairings, a spacing scale, component notes. Written
              for an agent, not a client. Paste it once and stop arguing with your
              AI about what &ldquo;cleaner&rdquo; means.
            </p>
            <div className="lp-terminal">
              <div className="lp-terminal-bar">
                <i />
                <i />
                <i />
                <span>cursor — new chat</span>
              </div>
              <pre>
                <span className="lp-t-prompt">›</span> Use the attached design guide.
                {"\n"}
                <span className="lp-t-dim">  palette</span>   porcelain #FBFAF7 · espresso #221C15 · mocha #8D6F4C
                {"\n"}
                <span className="lp-t-dim">  type</span>      Bricolage Grotesque display / Geist body
                {"\n"}
                <span className="lp-t-dim">  shape</span>     14px cards · pill buttons · low warm shadows
                {"\n"}
                <span className="lp-t-dim">  motion</span>    slow fade-up on scroll, 0.6s, ease-out
                {"\n"}
                <span className="lp-t-cursor">▊</span>
              </pre>
            </div>
          </div>
          <div className="lp-col-visual">
            <GuideDocument large />
          </div>
        </div>
      </section>

      {/* ── Before / after ───────────────────────────────────── */}
      <section className="lp-section lp-section-tint">
        <div className="lp-section-inner">
          <div className="ba-head">
            <div>
              <p className="lp-eyebrow">The difference</p>
              <h2 className="lp-h2">
                Same agent, same model. One of them read the guide.
              </h2>
            </div>
            <p className="lp-body ba-head-body">
              Designing a site shouldn&apos;t take fifty rounds of prompting.
              Hand your agent one guide — the palette, the type, the spacing,
              the shapes — and it stops guessing from the first message.
            </p>
          </div>

          <div className="ba">
            <figure className="ba-side ba-before">
              <figcaption className="ba-cap">
                <b>Without a guide</b>
                <span>&ldquo;make it look modern&rdquo;</span>
              </figcaption>
              <SlopMock />
            </figure>

            <figure className="ba-side ba-after">
              <figcaption className="ba-cap ba-cap-after">
                <b>With your guide</b>
                <span>midnight ledger</span>
                <CopyGuideButton />
              </figcaption>
              <GuidedMock />
            </figure>
          </div>

        </div>
      </section>

      {/* ── Library (free) ───────────────────────────────────── */}
      <section id="library" className="lp-section">
        <div className="lp-section-inner lp-cols">
          <div className="lp-col-copy">
            <p className="lp-eyebrow">The library — free forever</p>
            <h2 className="lp-h2">And underneath it, a properly good bookmark app.</h2>
            <p className="lp-body">
              The Mix needs somewhere to keep the references, so this half had to
              be worth using on its own. Most bookmark tools file links away like
              receipts; snapp keeps them like references — full visual previews,
              real favicons, tags you invent yourself. Free, and it stays free.
            </p>
            <ul className="lp-feature-list">
              <li>
                <strong>Save in one click.</strong> The Chrome extension saves
                the page you&apos;re on — or paste a URL. Either way snapp
                grabs the preview, favicon, fonts and colors.
              </li>
              <li>
                <strong>Organize by feel.</strong> Tags like &ldquo;dark &amp;
                loud&rdquo; or &ldquo;client-safe&rdquo; are welcome here.
              </li>
              <li>
                <strong>Find it in a keystroke.</strong> Type half a memory, get
                the site back.
              </li>
            </ul>
          </div>
          <div className="lp-col-visual">
            <LibraryVignette />
          </div>
        </div>
      </section>

      {/* ── The working flow ─────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">The working flow</p>
          <h2 className="lp-h2">
            The way you already work, minus the part where the references get
            lost.
          </h2>
          <ol className="lp-flow">
            {PHASES.map((s) => (
              <li key={s.n} className="lp-phase">
                <span className="lp-phase-rail" aria-hidden>
                  <i />
                </span>
                <span className="lp-phase-n">{s.n}</span>
                <h3 className="lp-h3">{s.verb}</h3>
                <p>{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="lp-section lp-section-tint">
        <div className="lp-section-inner">
          <p className="lp-eyebrow lp-center">Pricing</p>
          <h2 className="lp-h2 lp-center">Free to collect. Paid to compose.</h2>
          <p className="lp-sub lp-center">
            A credit is one design guide — from a single site or a Mix of up to
            eight. Bookmarks and scans never count against it.
          </p>
          <PricingPlans loggedIn={loggedIn} planHref={planHref} />
        </div>
      </section>

      {/* ── Writing ─────────────────────────────────────────── */}
      {posts.length > 0 && (
        <section className="lp-section">
          <div className="lp-section-inner">
            <p className="lp-eyebrow lp-center">From the blog</p>
            <h2 className="lp-h2 lp-center">
              How to say what you mean to a model.
            </h2>
            <div className="lp-latest">
              {posts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="lp-latest-card"
                >
                  <span>{p.topic ?? "Writing"}</span>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                </Link>
              ))}
            </div>
            <p className="lp-latest-more">
              <Link href="/blog" className="lp-btn lp-btn-ghost lp-btn-sm">
                Read the blog
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-inner lp-faq-inner">
          <p className="lp-eyebrow lp-center">Questions</p>
          <h2 className="lp-h2 lp-center">Before you sign up.</h2>
          <div className="lp-faq">
            {FAQS.map((f) => (
              <details key={f.q} className="lp-faq-item">
                <summary>
                  {f.q}
                  <i aria-hidden />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closer ───────────────────────────────────────────── */}
      <section className="lp-closer">
        <h2 className="lp-h1 lp-closer-h">
          Make it look like <span className="lp-that">that</span>.
        </h2>
        <Link href={appHref} className="lp-btn lp-btn-primary">
          {loggedIn ? "Open snapp" : "Start saving free"}
        </Link>
      </section>

    </MarketingShell>
  );
}

/* ═════════════════════ The fake app screenshot ═════════════════════ */

type Site = {
  name: string;
  domain: string;
  tone: string; // favicon + accent
  selected?: string[]; // borrow chips
  thumb: React.ReactNode;
};

// Eight believable "saved sites", each with its own miniature art direction.
function sites(): Site[] {
  return [
    {
      name: "Objekt",
      domain: "objekt.studio",
      tone: "#221C15",
      selected: ["Typography", "Layout"],
      thumb: (
        <div className="mk-thumb" style={{ background: "#F2EFE8" }}>
          <div className="mk-obj-nav">
            <b>OBJEKT®</b>
            <span>work — about</span>
          </div>
          <div className="mk-obj-display">
            GRAPHIC
            <br />
            MATTER
          </div>
          <span className="mk-obj-dot" />
        </div>
      ),
    },
    {
      name: "Meridian",
      domain: "meridian.app",
      tone: "#31435E",
      thumb: (
        <div className="mk-thumb" style={{ background: "#141B26", color: "#E8EDF5" }}>
          <div className="mk-mer-nav">
            <span className="mk-mer-logo" />
            <i />
            <i />
            <i />
          </div>
          <div className="mk-mer-h">Ship faster, together</div>
          <div className="mk-mer-sub" />
          <span className="mk-mer-btn">Get started</span>
        </div>
      ),
    },
    {
      name: "Grove",
      domain: "grove.earth",
      tone: "#5A7052",
      thumb: (
        <div className="mk-thumb" style={{ background: "#EFEDE3" }}>
          <div className="mk-grove-h">Slow food, grown close</div>
          <div className="mk-grove-img" />
          <div className="mk-grove-row">
            <i />
            <i />
          </div>
        </div>
      ),
    },
    {
      name: "Pulse",
      domain: "pulse.fm",
      tone: "#0F0F10",
      selected: ["Color"],
      thumb: (
        <div className="mk-thumb" style={{ background: "#0F0F10", color: "#D8FF4F" }}>
          <div className="mk-pulse-h">PULSE</div>
          <div className="mk-pulse-bars">
            {[14, 26, 9, 30, 18, 24, 11, 28, 15, 21].map((h, i) => (
              <i key={i} style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
      ),
    },
    {
      name: "Paper & Type",
      domain: "paperandtype.com",
      tone: "#9A5B43",
      thumb: (
        <div className="mk-thumb" style={{ background: "#FAF6EE" }}>
          <div className="mk-paper-mast">Paper &amp; Type</div>
          <div className="mk-paper-cols">
            <div>
              <i />
              <i />
              <i />
              <i />
            </div>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      ),
    },
    {
      name: "Nord",
      domain: "nord.bank",
      tone: "#3E4C7A",
      thumb: (
        <div className="mk-thumb" style={{ background: "#F5F6FA" }}>
          <div className="mk-nord-card">
            <span>**** 4421</span>
            <b>€2,480.00</b>
          </div>
          <div className="mk-nord-rows">
            <i />
            <i />
          </div>
        </div>
      ),
    },
    {
      name: "Kiln",
      domain: "kiln.ceramics",
      tone: "#B4643C",
      selected: ["Vibe"],
      thumb: (
        <div className="mk-thumb" style={{ background: "#E8D9CB" }}>
          <div className="mk-kiln-h">Kiln</div>
          <div className="mk-kiln-shelf">
            <i style={{ background: "#B4643C" }} />
            <i style={{ background: "#8A6B54" }} />
            <i style={{ background: "#5C4B3B" }} />
          </div>
        </div>
      ),
    },
    {
      name: "Fathom",
      domain: "fathom.dev",
      tone: "#1E2A24",
      thumb: (
        <div className="mk-thumb mk-term" style={{ background: "#101613", color: "#9BD4B0" }}>
          <span className="mk-term-line">$ fathom deploy --edge</span>
          <span className="mk-term-line mk-term-dim"> ✓ build 412ms</span>
          <span className="mk-term-line mk-term-dim"> ✓ 14 regions live</span>
          <span className="mk-term-cursor">▊</span>
        </div>
      ),
    },
  ];
}

function chipHue(label: string) {
  return ASPECTS.find((a) => a.label === label)?.hue ?? "#221C15";
}

function AppMockup() {
  const data = sites();
  let chipIndex = 0;
  return (
    <div className="mk-window" role="img" aria-label="The snapp app: a visual bookmark library with three sites selected and the generated design guide in the mix panel">
      {/* browser chrome */}
      <div className="mk-chrome">
        <div className="mk-chrome-dots">
          <i />
          <i />
          <i />
        </div>
        <div className="mk-chrome-url">usesnapp.app/app</div>
        <div className="mk-chrome-spacer" />
      </div>

      <div className="mk-app">
        {/* sidebar */}
        <aside className="mk-side">
          <div className="mk-side-brand">
            <span className="mk-side-logo">
              <LogoMark />
            </span>
            <b>snapp</b>
          </div>
          <div className="mk-side-search">⌘K &nbsp;Search library…</div>
          <p className="mk-side-label">Library</p>
          <div className="mk-side-item mk-side-active">
            <i className="mk-ico mk-ico-grid" />
            Bookmarks <span className="mk-side-count">24</span>
          </div>
          <div className="mk-side-item">
            <i className="mk-ico mk-ico-bench" />
            Mixes
          </div>
          <p className="mk-side-label">Tags</p>
          {[
            ["inspo", "#C25E6A"],
            ["saas", "#4C6B9A"],
            ["editorial", "#D9962F"],
            ["weird & great", "#48887B"],
          ].map(([t, c]) => (
            <div key={t} className="mk-side-item mk-side-tag">
              <i style={{ background: c }} />
              {t}
            </div>
          ))}
          <p className="mk-side-label">Mixes</p>
          <div className="mk-side-item mk-side-tag">
            <i className="mk-wb-dot" />
            Portfolio refresh
          </div>
          <div className="mk-side-item mk-side-tag">
            <i className="mk-wb-dot" />
            Landing v2
          </div>
          <div className="mk-side-foot">
            <span className="mk-avatar">K</span>
            <div>
              <b>Kasper</b>
              <span className="mk-pro">PRO</span>
            </div>
          </div>
        </aside>

        {/* main */}
        <main className="mk-main">
          {/* Composing a mix takes over the header — no title row, no Add
              button — exactly as it does in the app. */}
          <div className="mk-compose">
            <div className="mk-compose-left">
              <span className="mk-compose-badge">Mix</span>
              Portfolio refresh · <b>3 sources</b> · 4 aspects tagged
            </div>
            <span className="mk-cancel">Cancel</span>
            <span className="mk-generate">Generate guide</span>
          </div>

          {/* The designer's own direction — the one input that isn't borrowed
              from a site, and the thing that shapes the whole guide. */}
          <p className="mk-mixnotes-label">Mix notes</p>
          <div className="mk-mixnotes">
            A warm, editorial portfolio for a ceramics studio — calm, confident,
            nothing shouty. Keep it readable on mobile.
          </div>
          <p className="mk-hint">
            Tap sites to add them · <b>+ Borrow</b> tags aspects · <b>+ Note</b>{" "}
            says what tags can&apos;t
          </p>

          <div className="mk-grid">
            {data.map((s) => (
              <div key={s.domain} className={`mk-card${s.selected ? " mk-card-sel" : ""}`}>
                {s.selected && (
                  <>
                    <span className="mk-check">✓</span>
                    <span className="mk-chips">
                      {s.selected.map((c) => (
                        <span key={c} className="mk-chip" style={{ animationDelay: `${0.9 + chipIndex++ * 0.18}s` }}>
                          <i style={{ background: chipHue(c) }} />
                          {c}
                        </span>
                      ))}
                    </span>
                  </>
                )}
                {s.thumb}
                <div className="mk-meta">
                  <span className="mk-favicon" style={{ background: s.tone }}>
                    {s.name[0]}
                  </span>
                  <div>
                    <b>{s.name}</b>
                    <span>{s.domain}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* mix panel */}
        <aside className="mk-panel">
          <div className="mk-panel-head">
            <p className="mk-side-label">Mix</p>
            <b>Portfolio refresh</b>
            <span className="mk-panel-srcs">
              {["objekt.studio", "pulse.fm", "kiln.ceramics"].map((d) => (
                <span key={d} className="mk-src">
                  ✓ {d}
                </span>
              ))}
            </span>
            <span className="mk-notes">
              Your notes <i /> ⌄
            </span>
          </div>
          <GuideDocument />
          <div className="mk-panel-actions">
            <span className="mk-copy-btn">Copy for your agent</span>
            <span className="mk-icon-btn">⟳</span>
            <span className="mk-open-btn">Open ↗</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* The guide artifact — used small inside the mockup panel, large in the dark
   section. Same component so the story stays literal: this IS the output. */
/* One token line of the Color section: the hex, with the colour beside it. */
function Tok({ name, hex, note }: { name: string; hex: string; note?: string }) {
  return (
    <span className="bd-tok">
      <span className="bd-tok-n">{name}</span>
      <i style={{ background: hex }} />
      {hex}
      {note && <em>{note}</em>}
    </span>
  );
}

function GuideDocument({ large = false }: { large?: boolean }) {
  return (
    <div className={`bd${large ? " bd-large" : ""}`}>
      <p className="bd-label">Design guide</p>
      <div className="bd-doc">
        <p className="bd-h1">
          <span># </span>Combined Design Guide: Warm Editorial
        </p>

        <p className="bd-h2">
          <span>## </span>Design Philosophy
        </p>
        <p className="bd-p">
          Editorial calm on a warm paper ground. Objekt sets the voice with
          confident display type; Pulse lends the single loud accent; Kiln keeps
          every surface soft and hand-made.
        </p>

        <p className="bd-h2">
          <span>## </span>Typography
        </p>
        <p className="bd-p">
          Display — Bricolage Grotesque, 600, −0.02em <em>(Objekt)</em>
          <br />
          Body — Geist, 400/500, 1.6 line-height
          <br />
          Data — Geist Mono, 12px, 0.14em tracking
        </p>

        <p className="bd-h2">
          <span>## </span>Color &amp; Background
        </p>
        <p className="bd-p bd-toks">
          <Tok name="--bg" hex="#FBFAF7" note="porcelain" />
          <Tok name="--ink" hex="#221C15" note="espresso" />
          <Tok name="--accent" hex="#8D6F4C" note="mocha (Pulse)" />
          {large && <Tok name="--warn" hex="#C25E6A" note="rosewood" />}
          {large && <Tok name="--line" hex="#E7E1D5" />}
        </p>
        {large && (
          <p className="bd-p">
            Flat paper ground — no gradients, no glass. <em>(Kiln)</em>
          </p>
        )}

        {large && (
          <>
            <p className="bd-h2">
              <span>## </span>Layout &amp; Spacing
            </p>
            <p className="bd-p">
              1200px container · 4 / 8 / 12 / 20 / 32 scale · 14px card radius ·
              pill buttons
            </p>
          </>
        )}

        {/* Sections run in the order the prompt's <output-format> asks for. */}
        <p className="bd-h2 bd-fade-h">
          <span>## </span>
          {large ? "Components" : "Layout & Spacing"}
        </p>
      </div>
      {/* The guide keeps going — the panel scrolls in the real app. */}
      <div className="bd-more">
        {large
          ? "+ Motion & Effects · Imagery & Iconography · Your Additions · Design Tokens"
          : "+ 5 more sections"}
      </div>
    </div>
  );
}

/* ── Section vignettes (closeups of the same world) ── */

/* The paragraph beside this makes one claim no competitor can echo: everyone
   else files links away like receipts, snapp keeps them like references. So
   the vignette shows exactly that — a dead list of URLs on one side, the same
   sites as things you'd recognise on the other. The old version illustrated
   the search bullet, which is the third and smallest of the three. */
const RECEIPTS = [
  "https://grove.earth/",
  "pulse.fm — Pulse",
  "paperandtype.com/ab…",
  "grove.earth/menu",
  "(untitled) — 2 days ago",
  "https://www.pulse.fm/re…",
];

function LibraryVignette() {
  const picks = sites().filter((s) =>
    ["grove.earth", "pulse.fm"].includes(s.domain)
  );
  return (
    <div className="lv">
      <div className="lv-side lv-receipts">
        <p className="lv-label">Every other bookmark tool</p>
        <ul className="lv-list">
          {RECEIPTS.map((r) => (
            <li key={r}>
              <i />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="lv-side lv-refs">
        <p className="lv-label lv-label-snapp">snapp</p>
        <div className="lv-stack">
          {picks.map((s, i) => (
            <div key={s.domain} className={`mk-card lv-card lv-card-${i}`}>
              {s.thumb}
              <div className="mk-meta">
                <span className="mk-favicon" style={{ background: s.tone }}>
                  {s.name[0]}
                </span>
                <div>
                  <b>{s.name}</b>
                  <span>{s.domain}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="lp-note lv-note" aria-hidden>
        they&apos;re references ↗
      </span>
    </div>
  );
}

/* The two halves of the before/after.

   Both render the same page — same headline, same three cards, same buttons —
   because the claim is about design, not copy. If the words changed too, the
   comparison would be doing the work the guide is supposed to do.

   The left one is drawn from what every model reaches for unprompted: a
   violet gradient, a glass card, a badge with a sparkle in it, three feature
   tiles with emoji. It's a caricature only in how quickly it arrives. */
const GD_CHIPS = [
  "Plan this week's sprint",
  "Flag the blockers",
  "Sync the team",
  "Draft the standup",
  "Summarize the retro",
];

const GD_COLUMNS: { label: string; count: string; cards: string[][] }[] = [
  {
    label: "Now",
    count: "3",
    cards: [
      ["Billing retry queue", "Kestrel", "2d left"],
      ["Onboarding drop-off", "Ana", "in review"],
    ],
  },
  {
    label: "Next",
    count: "2",
    cards: [
      ["Q3 roadmap draft", "Sam", "Mon"],
      ["Funnel tracking", "Kestrel", "Tue"],
    ],
  },
  {
    label: "Shipped",
    count: "4",
    cards: [
      ["Auth rate limits", "Ana", "Fri"],
      ["Dark mode", "Sam", "Thu"],
    ],
  },
];

function SlopMock() {
  return (
    <div className="ba-mock sl">
      <header className="sl-nav">
        <span className="sl-logo">
          <i>◆</i> Northwind
        </span>
        <span className="sl-nav-links">
          <i>Product</i>
          <i>Pricing</i>
          <i>Changelog</i>
        </span>
        <span className="sl-nav-btns">
          <i className="sl-ghost">Sign in</i>
          <i className="sl-blue">Get started</i>
        </span>
      </header>

      <section className="sl-hero">
        <span className="sl-badge">
          <i>✦</i> Northwind — Your AI-powered workspace copilot
        </span>
        <h3 className="sl-h">
          Every project should ship in <em>one sprint</em> —{" "}
          <s>not one quarter</s>
        </h3>
        <p className="sl-sub">
          It&apos;s 2026 — your roadmap should plan itself. Northwind reads the
          work, writes the plan, and keeps the team honest.
        </p>
        <div className="sl-field">
          <i className="sl-field-icon">✉</i>
          <span>you@company.com</span>
          <i className="sl-blue">Get started free →</i>
        </div>
        <p className="sl-formnote">Free for teams up to 5. No card required.</p>
      </section>

      <div className="sl-chips">
        {GD_CHIPS.map((c) => (
          <span key={c} className="sl-chip">
            <i>✨</i>
            {c}
          </span>
        ))}
      </div>

      <div className="sl-board">
        <div className="sl-board-head">
          <span className="sl-board-title">
            <i />
            Sprint 24 — Northwind
          </span>
          <span className="sl-board-meta">Auto-planned 4m ago</span>
        </div>
        <div className="sl-cols">
          {GD_COLUMNS.map((col) => (
            <div key={col.label} className="sl-col">
              <div className="sl-col-head">
                <span>{col.label}</span>
                <span>{col.count}</span>
              </div>
              {col.cards.map(([title, owner, meta]) => (
                <div key={title} className="sl-card">
                  <b>{title}</b>
                  <span>
                    <i>{owner}</i>
                    {meta}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Northwind, as Midnight Ledger builds it. Transcribed from the full page the
   guide produced — same structure, same values, scaled to fit the panel:
   lime diamond mark, restrained-weight Archivo-class display, the dim second
   line, the marquee chip row, and the auto-planned sprint board. */
function GuidedMock() {
  return (
    <div className="ba-mock gd">
      <span className="gd-glow" aria-hidden />

      <header className="gd-nav">
        <span className="gd-logo">
          <i>◆</i> Northwind
        </span>
        <span className="gd-nav-links">
          <i>Product</i>
          <i>Pricing</i>
          <i>Changelog</i>
        </span>
        <span className="gd-nav-btns">
          <i className="gd-ghost">Sign in</i>
          <i className="gd-lime">Get access</i>
        </span>
      </header>

      <section className="gd-hero">
        <p className="gd-eyebrow">Workspace copilot</p>
        <h3 className="gd-h">
          Every project ships in <em>one sprint</em>
          <b className="gd-caret" aria-hidden />
        </h3>
        <p className="gd-h2">not one quarter.</p>
        <p className="gd-sub">
          It&apos;s 2026 — your roadmap should plan itself. Northwind reads the
          work, writes the plan, and keeps the team honest.
        </p>
        <div className="gd-field">
          <i className="gd-field-icon">✉</i>
          <span>you@company.com</span>
          <i className="gd-lime">Get access</i>
        </div>
        <p className="gd-formnote">Free for teams up to 5. No card required.</p>
      </section>

      <div className="gd-marquee">
        <div className="gd-chips">
          {GD_CHIPS.map((c) => (
            <span key={c} className="gd-chip">
              <i>✦</i>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="gd-board">
        <div className="gd-board-head">
          <span className="gd-board-title">
            <i />
            Sprint 24 — Northwind
          </span>
          <span className="gd-board-meta">Auto-planned 4m ago</span>
        </div>
        <div className="gd-cols">
          {GD_COLUMNS.map((col) => (
            <div key={col.label} className="gd-col">
              <div className="gd-col-head">
                <span>{col.label}</span>
                <span>{col.count}</span>
              </div>
              {col.cards.map(([title, owner, meta]) => (
                <div key={title} className="gd-card">
                  <b>{title}</b>
                  <span>
                    <i>{owner}</i>
                    {meta}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BorrowVignette() {
  const objekt = sites()[0];
  return (
    <div className="bv">
      <div className="mk-card mk-card-sel bv-card">
        <span className="mk-check">✓</span>
        {objekt.thumb}
        <div className="mk-meta">
          <span className="mk-favicon" style={{ background: objekt.tone }}>
            O
          </span>
          <div>
            <b>Objekt</b>
            <span>objekt.studio</span>
          </div>
        </div>
      </div>
      <div className="bv-menu">
        <p className="mk-side-label">Borrow from this site</p>
        {[
          ["Typography", true],
          ["Layout", true],
          ["Color", false],
          ["Motion & Scroll", false],
        ].map(([label, on]) => (
          <div
            key={label as string}
            className={`bv-opt${on ? " bv-on" : ""}`}
            style={
              { "--hue": chipHue(label as string) } as React.CSSProperties
            }
          >
            <i />
            {label}
            <span>{on ? "✓" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

