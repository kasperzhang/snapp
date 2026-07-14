import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────────────────────
   snapp landing — "the annotated screenshot"

   One idea carries the page: a large, believable screenshot of the app doing
   its real job (library → borrow chips → brief), marked up like a designer's
   moodboard. Warm tones belong to the human/taste side; the single cool blue
   belongs to the agent/code side. The footer prints this page's own brief.
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

const STEPS = [
  { n: "01", verb: "Save", line: "Bookmark the sites you love. Free, unlimited, gorgeous." },
  { n: "02", verb: "Borrow", line: "Tag what each one gets right — this type, that color, that scroll." },
  { n: "03", verb: "Brief", line: "Paste one spec into your agent instead of forty prompts." },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;
  const appHref = loggedIn ? "/app" : "/signup";

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: lpCss }} />

      {/* ── Nav ──────────────────────────────────────────────── */}
      <header className="lp-nav">
        <nav className="lp-nav-inner">
          <Link href="/" className="lp-wordmark">
            <span className="lp-logo-tile">s</span>
            <span>snapp</span>
          </Link>
          <div className="lp-nav-links">
            <a href="#library">Library</a>
            <a href="#mix">Mix</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-cta">
            {loggedIn ? (
              <Link href="/app" className="lp-btn lp-btn-primary lp-btn-sm">
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login" className="lp-nav-login">
                  Log in
                </Link>
                <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-sm">
                  Start free
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="lp-hero">
        <p className="lp-eyebrow lp-rise">Bookmarks for people who build with AI</p>
        <h1 className="lp-h1 lp-rise lp-d1">
          Make it look like <span className="lp-that">that</span>.
        </h1>
        <p className="lp-hero-sub lp-rise lp-d2">
          snapp is where you keep the sites you wish you&apos;d made. Save them free, in
          a library that looks as good as they do — then mix your favorites into one
          design brief your coding agent can actually follow.
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
          <span className="lp-note lp-note-brief" aria-hidden>
            one brief, three sites →
          </span>
          <AppMockup />
        </div>
        <p className="lp-agents">
          <span>Paste the brief into</span>
          Cursor · Claude Code · v0 · Lovable · Bolt
        </p>
      </section>

      {/* ── Library (free) ───────────────────────────────────── */}
      <section id="library" className="lp-section">
        <div className="lp-section-inner lp-cols">
          <div className="lp-col-copy">
            <p className="lp-eyebrow">The library — free forever</p>
            <h2 className="lp-h2">A bookmark app with a designer&apos;s eye.</h2>
            <p className="lp-body">
              Most bookmark tools file your links away like receipts. snapp keeps
              them like references — full visual previews, real favicons, tags you
              invent yourself. It&apos;s free, and it stays free.
            </p>
            <ul className="lp-feature-list">
              <li>
                <strong>Save in one paste.</strong> Drop a URL; snapp grabs the
                preview, favicon, fonts and colors.
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

      {/* ── The brief (dark) ─────────────────────────────────── */}
      <section className="lp-dark">
        <div className="lp-section-inner lp-cols">
          <div className="lp-col-copy">
            <p className="lp-eyebrow lp-eyebrow-dark">The output</p>
            <h2 className="lp-h2 lp-h2-dark">One brief instead of forty prompts.</h2>
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
                <span className="lp-t-prompt">›</span> Use the attached design brief.
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
            <BriefDocument large />
          </div>
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step">
                <span className="lp-step-n">{s.n}</span>
                <h3 className="lp-h3">{s.verb}</h3>
                <p>{s.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="lp-section lp-section-tint">
        <div className="lp-section-inner">
          <p className="lp-eyebrow lp-center">Pricing</p>
          <h2 className="lp-h2 lp-center">Free to collect. Pro to compose.</h2>
          <div className="lp-plans">
            <div className="lp-plan">
              <h3>Free</h3>
              <div className="lp-price">
                $0 <span>forever</span>
              </div>
              <p className="lp-plan-blurb">The library, always yours.</p>
              <ul>
                <li>Unlimited bookmarks</li>
                <li>Previews, tags &amp; instant search</li>
                <li>30 deep site scans a month</li>
                <li>5 briefs to try the Mix</li>
              </ul>
              <Link href={appHref} className="lp-btn lp-btn-ghost lp-btn-block">
                {loggedIn ? "Open app" : "Start free"}
              </Link>
            </div>
            <div className="lp-plan lp-plan-pro">
              <span className="lp-plan-flag">Pro</span>
              <h3>Pro</h3>
              <div className="lp-price">
                $12 <span>/ month</span>
              </div>
              <p className="lp-plan-blurb">The Mix, unlocked.</p>
              <ul>
                <li>Everything in Free</li>
                <li>200 design briefs a month</li>
                <li>1,000 site analyses a month</li>
                <li>Priority generation</li>
              </ul>
              <Link href={appHref} className="lp-btn lp-btn-primary lp-btn-block">
                {loggedIn ? "Go Pro" : "Start free"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closer ───────────────────────────────────────────── */}
      <section className="lp-closer">
        <h2 className="lp-h1 lp-closer-h">Your agent has taste now.</h2>
        <Link href={appHref} className="lp-btn lp-btn-primary">
          {loggedIn ? "Open snapp" : "Start saving free"}
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <Link href="/" className="lp-wordmark lp-wordmark-sm">
            <span className="lp-logo-tile">s</span>
            <span>snapp</span>
          </Link>
          <p className="lp-footer-spec">
            This page&apos;s brief — porcelain <i className="lp-swatch-i" style={{ background: "#FBFAF7" }} />{" "}
            #FBFAF7 · espresso <i className="lp-swatch-i" style={{ background: "#221C15" }} /> #221C15 ·
            mocha <i className="lp-swatch-i" style={{ background: "#8D6F4C" }} /> #8D6F4C · set in
            Bricolage Grotesque &amp; Geist. Briefed by snapp.
          </p>
          <p className="lp-footer-copy">© {new Date().getFullYear()} snapp</p>
        </div>
      </footer>
    </div>
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
    <div className="mk-window" role="img" aria-label="The snapp app: a visual bookmark library with three sites selected and a generated design brief panel">
      {/* browser chrome */}
      <div className="mk-chrome">
        <div className="mk-chrome-dots">
          <i />
          <i />
          <i />
        </div>
        <div className="mk-chrome-url">app.snapp.design</div>
        <div className="mk-chrome-spacer" />
      </div>

      <div className="mk-app">
        {/* sidebar */}
        <aside className="mk-side">
          <div className="mk-side-brand">
            <span className="mk-side-logo">s</span>
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
          <div className="mk-topbar">
            <div>
              <b>Bookmarks</b>
              <span>24 sites</span>
            </div>
            <div className="mk-topbar-actions">
              <span className="mk-view-toggle">
                <i className="mk-view-on" />
                <i />
              </span>
              <span className="mk-add">+ Add bookmark</span>
            </div>
          </div>

          <div className="mk-compose">
            <div className="mk-compose-left">
              <span className="mk-compose-badge">Mix</span>
              Portfolio refresh · <b>3 sources</b> · 4 aspects tagged
            </div>
            <span className="mk-generate">Generate brief</span>
          </div>

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

        {/* brief panel */}
        <aside className="mk-panel">
          <div className="mk-panel-head">
            <p className="mk-side-label">Brief preview</p>
            <b>Warm Editorial</b>
            <span>from 3 sources · just now</span>
          </div>
          <BriefDocument />
          <div className="mk-panel-actions">
            <span className="mk-copy-btn">Copy for your agent</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* The brief artifact — used small inside the mockup panel, large in the dark
   section. Same component so the story stays literal: this IS the output. */
function BriefDocument({ large = false }: { large?: boolean }) {
  return (
    <div className={`bd${large ? " bd-large" : ""}`}>
      <p className="bd-label">Design brief</p>
      <h4>Warm Editorial</h4>

      <p className="bd-sec">Palette</p>
      <div className="bd-swatches">
        {[
          ["#FBFAF7", "porcelain"],
          ["#221C15", "espresso"],
          ["#8D6F4C", "mocha"],
          ["#C25E6A", "rosewood"],
          ["#D9962F", "ochre"],
        ].map(([c, n]) => (
          <div key={c} className="bd-swatch">
            <i style={{ background: c }} />
            {large && <span>{n}</span>}
          </div>
        ))}
      </div>

      <p className="bd-sec">Type</p>
      <div className="bd-type">
        <span className="bd-aa">Aa</span>
        <div>
          <b>Bricolage Grotesque — display</b>
          <span>Geist — body · Geist Mono — data</span>
        </div>
      </div>

      <p className="bd-sec">Space &amp; shape</p>
      <div className="bd-scale">
        {[4, 8, 12, 20, 32].map((n) => (
          <i key={n} style={{ width: `${n}px` }} />
        ))}
        <span>14px cards · pill buttons</span>
      </div>

      {large && (
        <>
          <p className="bd-sec">Voice</p>
          <p className="bd-voice">
            Confident, unhurried. Buttons say what they do. Nothing shouts.
          </p>
        </>
      )}

      <div className="bd-code">
        <span>--accent:</span> #8D6F4C; <span>--radius:</span> 14px;
      </div>
    </div>
  );
}

/* ── Section vignettes (closeups of the same world) ── */

function LibraryVignette() {
  const picks = sites().filter((s) =>
    ["grove.earth", "pulse.fm", "paperandtype.com"].includes(s.domain)
  );
  return (
    <div className="lv">
      <div className="lv-search">
        <span>⌘K</span> that dark site with the acid green…
      </div>
      <div className="lv-row">
        {picks.map((s, i) => (
          <div key={s.domain} className={`mk-card lv-card lv-card-${i}${s.domain === "pulse.fm" ? " lv-hit" : ""}`}>
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
      <span className="lp-note lv-note" aria-hidden>
        found it ↑
      </span>
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
          <div key={label as string} className={`bv-opt${on ? " bv-on" : ""}`}>
            <i style={{ background: chipHue(label as string) }} />
            {label}
            <span>{on ? "✓" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════ CSS ═════════════════════════════ */

const lpCss = `
.lp {
  --paper: #FBFAF7;
  --ink: #221C15;
  --ink-soft: #5C5346;
  --ink-mute: #9C927F;
  --line: #E7E1D5;
  --card: #FFFFFF;
  --mocha: #8D6F4C;
  --mocha-deep: #6B5335;
  --mocha-tint: #F1EBE0;
  --agent: #4C6B9A;
  --agent-ink: #17202E;
  --dark: #201A13;
  --dark-2: #2A2219;
  --display: var(--font-bricolage), var(--font-space-grotesk), sans-serif;
  --body: var(--font-geist-sans), system-ui, sans-serif;
  --mono: var(--font-geist-mono), monospace;
  --hand: var(--font-playpen), cursive;

  background: var(--paper);
  color: var(--ink);
  font-family: var(--body);
  min-height: 100vh;
  overflow-x: clip;
}
.lp a { text-decoration: none; color: inherit; }
.lp i, .lp b { font-style: normal; }

/* ── primitives ── */
.lp-eyebrow {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mocha);
  margin-bottom: 18px;
}
.lp-eyebrow-dark { color: #C9AE87; }
.lp-h1 {
  font-family: var(--display);
  font-weight: 700;
  font-size: clamp(3rem, 7.2vw, 5.6rem);
  line-height: 1.0;
  letter-spacing: -0.035em;
}
.lp-h2 {
  font-family: var(--display);
  font-weight: 650;
  font-size: clamp(1.9rem, 3.8vw, 2.9rem);
  line-height: 1.08;
  letter-spacing: -0.025em;
  max-width: 21em;
}
.lp-h2-dark { color: #F3EDE2; }
.lp-h3 {
  font-family: var(--display);
  font-weight: 650;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  letter-spacing: -0.015em;
}
.lp-body {
  margin-top: 18px;
  font-size: 16px;
  line-height: 1.65;
  color: var(--ink-soft);
  max-width: 34em;
}
.lp-body-dark { color: #B7AB97; }
.lp-center { text-align: center; margin-left: auto; margin-right: auto; }

.lp-btn {
  display: inline-block;
  font-size: 15px;
  font-weight: 550;
  padding: 14px 28px;
  border-radius: 999px;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.lp-btn-sm { padding: 9px 18px; font-size: 13.5px; }
.lp-btn-block { display: block; text-align: center; margin-top: 26px; padding: 12px; font-size: 14px; }
.lp .lp-btn-primary { background: var(--mocha-deep); color: #FBFAF7; }
.lp .lp-btn-primary:hover { background: var(--ink); transform: translateY(-1px); }
.lp .lp-btn-ghost { border: 1px solid var(--line); background: var(--card); color: var(--ink); }
.lp .lp-btn-ghost:hover { border-color: var(--ink-mute); }
.lp :is(a,button):focus-visible { outline: 2px solid var(--mocha); outline-offset: 3px; border-radius: 6px; }

/* ── nav ── */
.lp-nav {
  position: sticky; top: 0; z-index: 40;
  background: color-mix(in srgb, var(--paper) 82%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.lp-nav-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 28px;
  height: 62px; display: flex; align-items: center; justify-content: space-between;
}
.lp-wordmark { display: flex; align-items: center; gap: 9px; font-family: var(--display); font-weight: 700; font-size: 19px; letter-spacing: -0.02em; }
.lp-logo-tile {
  width: 27px; height: 27px; border-radius: 8px;
  background: var(--mocha); color: #FBFAF7;
  display: grid; place-items: center;
  font-size: 16px; font-weight: 700;
}
.lp-nav-links { display: flex; gap: 30px; font-size: 13.5px; color: var(--ink-soft); }
.lp-nav-links a:hover { color: var(--ink); }
.lp-nav-cta { display: flex; align-items: center; gap: 16px; }
.lp-nav-login { font-size: 13.5px; color: var(--ink-soft); }
.lp-nav-login:hover { color: var(--ink); }
@media (max-width: 720px) { .lp-nav-links, .lp-nav-login { display: none; } }

/* ── hero ── */
.lp-hero {
  max-width: 880px; margin: 0 auto; padding: 92px 28px 0;
  text-align: center;
}
.lp-hero-sub {
  margin: 26px auto 0; max-width: 39em;
  font-size: 17.5px; line-height: 1.65; color: var(--ink-soft);
}
.lp-hero-ctas { margin-top: 36px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.lp-hero-note { margin-top: 16px; font-size: 13px; color: var(--ink-mute); }

.lp-that { font-style: italic; color: var(--mocha); }

/* ── screenshot ── */
.lp-shot-wrap { padding: 64px 20px 0; }
.lp-shot { position: relative; max-width: 1180px; margin: 0 auto; }
.lp-shot::before {
  content: ""; position: absolute; inset: -8% -12% -14%;
  background: radial-gradient(58% 62% at 50% 42%, rgba(141,111,76,0.16), transparent 70%);
  pointer-events: none;
}
.lp-agents {
  max-width: 1180px; margin: 26px auto 0; text-align: center;
  font-family: var(--mono); font-size: 12.5px; color: var(--ink-soft);
  letter-spacing: 0.04em;
}
.lp-agents span {
  display: inline-block; margin-right: 14px;
  text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.2em; color: var(--ink-mute);
}

.lp-note {
  position: absolute; z-index: 5;
  font-family: var(--hand); font-size: 15.5px; color: var(--ink-soft);
  opacity: 0; animation: lpFade 0.5s ease-out 1.5s forwards;
}
.lp-note-borrow { top: -34px; left: 26%; transform: rotate(-3deg); }
.lp-note-brief { top: -34px; right: 4%; transform: rotate(2deg); }
@media (max-width: 900px) { .lp-note { display: none; } }

/* browser window */
.mk-window {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--card);
  box-shadow: 0 1px 2px rgba(34,28,21,0.05), 0 24px 70px -18px rgba(34,28,21,0.22);
  overflow: hidden;
}
.mk-chrome {
  display: flex; align-items: center; gap: 14px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  background: #F6F3EC;
}
.mk-chrome-dots { display: flex; gap: 6px; }
.mk-chrome-dots i { width: 10px; height: 10px; border-radius: 50%; background: #DCD5C6; }
.mk-chrome-url {
  flex: 0 1 340px; margin: 0 auto;
  font-family: var(--mono); font-size: 11px; color: var(--ink-mute);
  background: var(--card); border: 1px solid var(--line);
  border-radius: 7px; padding: 4px 12px; text-align: center;
}
.mk-chrome-spacer { width: 42px; }

.mk-app { display: flex; text-align: left; background: var(--card); }

/* sidebar */
.mk-side {
  width: 208px; flex-shrink: 0;
  border-right: 1px solid var(--line);
  background: #F6F3EC;
  padding: 14px 12px 12px;
  display: flex; flex-direction: column;
  font-size: 12.5px;
}
.mk-side-brand { display: flex; align-items: center; gap: 8px; font-family: var(--display); font-size: 15px; font-weight: 700; padding: 2px 6px 12px; }
.mk-side-logo { width: 21px; height: 21px; border-radius: 6px; background: var(--mocha); color: #FBFAF7; display: grid; place-items: center; font-size: 12px; }
.mk-side-search {
  border: 1px solid var(--line); background: var(--card); border-radius: 8px;
  padding: 6px 10px; font-size: 11.5px; color: var(--ink-mute); margin-bottom: 14px;
}
.mk-side-label {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink-mute); margin: 10px 6px 5px;
}
.mk-side-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 8px; color: var(--ink-soft);
}
.mk-side-active { background: var(--mocha-tint); color: var(--ink); font-weight: 550; }
.mk-side-count { margin-left: auto; font-size: 10.5px; color: var(--ink-mute); }
.mk-side-tag i { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.mk-wb-dot { width: 7px; height: 7px; border-radius: 2.5px; background: var(--mocha); flex-shrink: 0; }
.mk-ico { width: 12px; height: 12px; border: 1.5px solid currentColor; border-radius: 3px; opacity: 0.75; }
.mk-ico-grid { background: linear-gradient(currentColor, currentColor) 50% 0/1.5px 100% no-repeat, linear-gradient(currentColor, currentColor) 0 50%/100% 1.5px no-repeat; }
.mk-ico-bench { border-radius: 3px 3px 6px 6px; }
.mk-side-foot {
  margin-top: auto; display: flex; align-items: center; gap: 8px;
  border-top: 1px solid var(--line); padding: 10px 6px 2px;
}
.mk-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--ink); color: var(--paper); display: grid; place-items: center; font-size: 11px; font-weight: 600; }
.mk-side-foot b { display: block; font-size: 12px; }
.mk-pro {
  font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.12em;
  background: var(--mocha); color: #FBFAF7; border-radius: 4px; padding: 1.5px 5px;
}

/* main */
.mk-main { flex: 1; min-width: 0; padding: 16px 18px 20px; }
.mk-topbar { display: flex; align-items: center; justify-content: space-between; white-space: nowrap; gap: 8px; }
.mk-topbar b { font-family: var(--display); font-size: 17px; font-weight: 650; margin-right: 10px; }
.mk-topbar span { font-size: 12px; color: var(--ink-mute); }
.mk-topbar-actions { display: flex; align-items: center; gap: 10px; }
.mk-view-toggle { display: flex; gap: 3px; border: 1px solid var(--line); border-radius: 7px; padding: 3px; }
.mk-view-toggle i { width: 16px; height: 14px; border-radius: 4px; background: var(--line); opacity: 0.6; }
.mk-view-on { background: var(--mocha-tint); border: 1px solid var(--mocha); opacity: 1; }
.mk-add {
  background: var(--mocha-deep); color: #FBFAF7;
  font-size: 12px; font-weight: 550; border-radius: 999px; padding: 7px 14px;
  white-space: nowrap;
}
.mk-compose {
  margin-top: 13px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  border: 1px solid #DECDB4; background: linear-gradient(90deg, #F8F2E7, #FDFBF6);
  border-radius: 11px; padding: 9px 12px; font-size: 12.5px; color: var(--ink-soft);
}
.mk-compose b { color: var(--ink); }
.mk-compose-left { display: flex; align-items: center; gap: 9px; min-width: 0; white-space: nowrap; overflow: hidden; }
.mk-compose-badge {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  border: 1px solid var(--mocha); color: var(--mocha); border-radius: 5px; padding: 2px 6px;
}
.mk-generate {
  flex-shrink: 0; background: var(--ink); color: var(--paper);
  font-size: 11.5px; font-weight: 550; border-radius: 999px; padding: 6px 13px;
}

.mk-grid {
  margin-top: 14px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.mk-card {
  position: relative;
  border: 1px solid var(--line); border-radius: 12px; background: var(--card);
  overflow: visible;
  box-shadow: 0 1px 2px rgba(34,28,21,0.04);
}
.mk-card-sel { border-color: var(--mocha); box-shadow: 0 0 0 1px var(--mocha), 0 6px 18px -6px rgba(141,111,76,0.35); }
.mk-check {
  position: absolute; top: -7px; left: -7px; z-index: 4;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--mocha); color: #FBFAF7;
  font-size: 10px; display: grid; place-items: center;
}
.mk-chips { position: absolute; top: -11px; right: 8px; z-index: 4; display: flex; gap: 5px; }
.mk-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--ink); color: var(--paper);
  font-size: 10px; font-weight: 550; border-radius: 999px; padding: 3.5px 9px;
  box-shadow: 0 3px 8px rgba(34,28,21,0.25);
  opacity: 0; transform: scale(0.5) translateY(6px);
  animation: lpPin 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.mk-chip i { width: 6px; height: 6px; border-radius: 50%; }

.mk-thumb {
  height: 96px; border-radius: 11px 11px 0 0; overflow: hidden;
  padding: 10px 12px; position: relative; color: var(--ink);
}
.mk-meta { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--line); }
.mk-favicon {
  width: 20px; height: 20px; border-radius: 6px; color: #FFF;
  display: grid; place-items: center; font-size: 10px; font-weight: 650; flex-shrink: 0;
}
.mk-meta b { display: block; font-size: 11.5px; line-height: 1.25; }
.mk-meta span { display: block; font-size: 10px; color: var(--ink-mute); }

/* mini-site art direction */
.mk-obj-nav { display: flex; justify-content: space-between; font-size: 6.5px; letter-spacing: 0.05em; }
.mk-obj-nav span { opacity: 0.55; }
.mk-obj-display { margin-top: 10px; font-family: var(--display); font-weight: 800; font-size: 21px; line-height: 0.92; letter-spacing: -0.02em; }
.mk-obj-dot { position: absolute; right: 12px; bottom: 12px; width: 11px; height: 11px; border-radius: 50%; background: #D14B32; }
.mk-mer-nav { display: flex; gap: 5px; align-items: center; }
.mk-mer-logo { width: 8px; height: 8px; border-radius: 2.5px; background: #6E92C9; }
.mk-mer-nav i { width: 16px; height: 3px; border-radius: 2px; background: rgba(232,237,245,0.28); }
.mk-mer-h { margin-top: 13px; font-weight: 650; font-size: 12.5px; letter-spacing: -0.01em; }
.mk-mer-sub { margin-top: 6px; width: 70%; height: 4px; border-radius: 2px; background: rgba(232,237,245,0.25); }
.mk-mer-btn { display: inline-block; margin-top: 9px; background: #6E92C9; color: #0E1520; font-size: 7.5px; font-weight: 650; border-radius: 999px; padding: 3px 8px; }
.mk-grove-h { font-family: Georgia, serif; font-size: 12px; font-style: italic; color: #3E4A38; }
.mk-grove-img { margin-top: 7px; height: 34px; border-radius: 7px; background: linear-gradient(120deg, #7B8F6B, #4E5F44 60%, #38452F); }
.mk-grove-row { display: flex; gap: 5px; margin-top: 6px; }
.mk-grove-row i { flex: 1; height: 5px; border-radius: 3px; background: #D8D3C0; }
.mk-pulse-h { font-family: var(--display); font-weight: 800; font-size: 15px; letter-spacing: 0.24em; }
.mk-pulse-bars { display: flex; align-items: flex-end; gap: 3.5px; margin-top: 12px; height: 32px; }
.mk-pulse-bars i { flex: 1; background: #D8FF4F; border-radius: 2px 2px 0 0; opacity: 0.9; }
.mk-paper-mast { font-family: Georgia, serif; font-size: 12.5px; text-align: center; border-bottom: 1px solid #DCD2BC; padding-bottom: 5px; color: #4A3F30; }
.mk-paper-cols { display: flex; gap: 8px; margin-top: 7px; }
.mk-paper-cols > div { flex: 1; display: flex; flex-direction: column; gap: 3.5px; }
.mk-paper-cols i { height: 3.5px; border-radius: 2px; background: #DED4BE; }
.mk-paper-cols i:first-child { background: #C9BCA0; width: 72%; }
.mk-nord-card {
  background: #3E4C7A; color: #EDF0F8; border-radius: 8px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 4px; font-size: 8px;
}
.mk-nord-card b { font-size: 12px; font-weight: 650; }
.mk-nord-rows { margin-top: 7px; display: flex; flex-direction: column; gap: 4px; }
.mk-nord-rows i { height: 6px; border-radius: 3px; background: #E3E6EF; }
.mk-kiln-h { font-family: Georgia, serif; font-size: 13px; color: #5C4632; }
.mk-kiln-shelf { display: flex; gap: 7px; margin-top: 9px; align-items: flex-end; }
.mk-kiln-shelf i { flex: 1; border-radius: 6px 6px 3px 3px; height: 30px; }
.mk-kiln-shelf i:nth-child(2) { height: 38px; border-radius: 50% 50% 3px 3px; }
.mk-term { font-family: var(--mono); font-size: 8.5px; line-height: 1.8; }
.mk-term-line { display: block; }
.mk-term-dim { opacity: 0.55; }
.mk-term-cursor { display: inline-block; animation: lpBlink 1.1s steps(1) infinite; }

/* brief panel */
.mk-panel {
  width: 252px; flex-shrink: 0;
  border-left: 1px solid var(--line);
  background: #F6F3EC;
  padding: 16px 14px;
  display: flex; flex-direction: column; gap: 12px;
}
.mk-panel-head b { font-family: var(--display); font-size: 15px; font-weight: 650; display: block; }
.mk-panel-head > span { font-size: 10.5px; color: var(--ink-mute); }
.mk-panel-actions { margin-top: auto; }
.mk-copy-btn {
  display: block; text-align: center;
  background: var(--mocha-deep); color: #FBFAF7;
  font-size: 12px; font-weight: 550; border-radius: 999px; padding: 9px;
}

@media (max-width: 1080px) { .mk-panel { display: none; } .lp-note-brief { display: none; } }
@media (max-width: 860px) {
  .mk-side { display: none; }
  .mk-grid { grid-template-columns: repeat(3, 1fr); }
  .mk-grid .mk-card:nth-child(n+7) { display: none; }
}
@media (max-width: 560px) {
  .mk-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .mk-grid .mk-card:nth-child(n+5) { display: none; }
  .mk-compose-left { font-size: 11px; }
  .mk-thumb { height: 82px; }
  .mk-topbar > div:first-child span { display: none; }
  .mk-view-toggle { display: none; }
}

/* ── brief document ── */
.bd {
  background: var(--card); border: 1px solid var(--line); border-radius: 13px;
  padding: 14px; font-size: 11px;
}
.bd-label { font-family: var(--mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); }
.bd h4 { font-family: var(--display); font-size: 16px; font-weight: 650; margin-top: 3px; letter-spacing: -0.01em; }
.bd-sec { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mute); margin: 12px 0 6px; }
.bd-swatches { display: flex; gap: 5px; }
.bd-swatch { flex: 1; }
.bd-swatch i { display: block; height: 26px; border-radius: 6px; border: 1px solid var(--line); }
.bd-swatch span { display: block; margin-top: 4px; font-family: var(--mono); font-size: 8.5px; color: var(--ink-mute); text-align: center; }
.bd-type { display: flex; align-items: center; gap: 10px; }
.bd-aa { font-family: var(--display); font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.bd-type b { display: block; font-size: 10.5px; }
.bd-type span { display: block; font-size: 9.5px; color: var(--ink-mute); }
.bd-scale { display: flex; align-items: center; gap: 4px; }
.bd-scale i { height: 14px; border-radius: 3px; background: var(--mocha-tint); border: 1px solid #DECDB4; }
.bd-scale span { margin-left: 6px; font-size: 9px; color: var(--ink-mute); }
.bd-voice { font-size: 10.5px; line-height: 1.55; color: var(--ink-soft); font-style: italic; }
.bd-code {
  margin-top: 12px; font-family: var(--mono); font-size: 9.5px;
  background: var(--agent-ink); color: #C7D5EA;
  border-radius: 8px; padding: 8px 10px;
}
.bd-code span { color: #7E97BC; }

.bd-large { padding: 30px 32px; font-size: 13px; border-radius: 18px; box-shadow: 0 30px 80px -20px rgba(0,0,0,0.5); transform: rotate(-1deg); }
.bd-large h4 { font-size: 26px; }
.bd-large .bd-label { font-size: 10px; }
.bd-large .bd-sec { font-size: 10px; margin: 18px 0 9px; }
.bd-large .bd-swatch i { height: 40px; border-radius: 9px; }
.bd-large .bd-aa { font-size: 40px; }
.bd-large .bd-type b { font-size: 13px; }
.bd-large .bd-type span { font-size: 11.5px; }
.bd-large .bd-scale i { height: 20px; }
.bd-large .bd-scale span { font-size: 11px; }
.bd-large .bd-voice { font-size: 13px; }
.bd-large .bd-code { font-size: 11.5px; padding: 12px 14px; margin-top: 18px; }

/* ── sections ── */
.lp-section { padding: 110px 28px; }
.lp-section-tint { background: #F6F3EC; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.lp-section-inner { max-width: 1120px; margin: 0 auto; }
.lp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
.lp-cols-wb { margin-top: 72px; }
@media (max-width: 900px) { .lp-cols { grid-template-columns: 1fr; gap: 44px; } }

.lp-feature-list { margin-top: 28px; display: flex; flex-direction: column; gap: 16px; }
.lp-feature-list li {
  list-style: none; font-size: 15px; line-height: 1.6; color: var(--ink-soft);
  padding-left: 18px; position: relative;
}
.lp-feature-list li::before {
  content: ""; position: absolute; left: 0; top: 9px;
  width: 7px; height: 7px; border-radius: 2.5px; background: var(--mocha);
}
.lp-feature-list strong { color: var(--ink); font-weight: 600; }

.lp-wb-head { max-width: 640px; }
.lp-pro-tag {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em;
  background: var(--mocha); color: #FBFAF7; border-radius: 5px; padding: 2.5px 7px;
  vertical-align: 2px; margin-left: 8px;
}
.lp-aspects { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 26px; }
.lp-aspect {
  display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid var(--line); background: var(--card);
  border-radius: 999px; padding: 8px 15px; font-size: 13.5px;
}
.lp-aspect i { width: 8px; height: 8px; border-radius: 50%; }

/* library vignette */
.lv { position: relative; padding-top: 26px; }
.lv-search {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 6;
  display: flex; align-items: center; gap: 10px; white-space: nowrap;
  background: var(--ink); color: var(--paper);
  border-radius: 12px; padding: 12px 18px; font-size: 13.5px;
  box-shadow: 0 16px 40px -8px rgba(34,28,21,0.4);
}
.lv-search span { font-family: var(--mono); font-size: 10.5px; border: 1px solid rgba(251,250,247,0.3); border-radius: 5px; padding: 2px 6px; }
.lv-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding-top: 26px; }
.lv-card-0 { transform: rotate(-1.5deg) translateY(8px); }
.lv-card-2 { transform: rotate(1.8deg) translateY(4px); }
.lv-hit { box-shadow: 0 0 0 2px var(--mocha), 0 14px 34px -10px rgba(141,111,76,0.45); }
.lv-note { position: absolute; bottom: -30px; right: 16%; transform: rotate(-2deg); animation: none; opacity: 1; }
@media (max-width: 560px) { .lv-row { grid-template-columns: repeat(2, 1fr); } .lv-row .mk-card:nth-child(3) { display: none; } }

/* borrow vignette */
.bv { display: flex; gap: 18px; align-items: center; justify-content: center; }
.bv-card { width: min(46%, 230px); flex-shrink: 0; transform: rotate(-1.5deg); }
.bv-menu {
  background: var(--card); border: 1px solid var(--line); border-radius: 13px;
  padding: 12px 13px; width: min(50%, 230px);
  box-shadow: 0 18px 44px -12px rgba(34,28,21,0.18);
  transform: rotate(0.8deg);
}
.bv-opt {
  display: flex; align-items: center; gap: 9px;
  font-size: 12.5px; padding: 7px 9px; border-radius: 8px; color: var(--ink-soft);
}
.bv-opt i { width: 7px; height: 7px; border-radius: 50%; }
.bv-opt span { margin-left: auto; color: var(--mocha); font-weight: 650; font-size: 11px; }
.bv-on { background: var(--mocha-tint); color: var(--ink); font-weight: 550; }

/* dark section */
.lp-dark {
  background: var(--dark); color: #F3EDE2;
  padding: 120px 28px;
  background-image: radial-gradient(70% 60% at 78% 30%, rgba(141,111,76,0.16), transparent 70%);
}
.lp-dark .lp-cols { align-items: center; }
.lp-terminal {
  margin-top: 34px; border-radius: 13px; overflow: hidden;
  border: 1px solid #3A3125;
  background: var(--agent-ink);
  box-shadow: 0 20px 50px -16px rgba(0,0,0,0.6);
}
.lp-terminal-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 13px; border-bottom: 1px solid rgba(126,151,188,0.18);
}
.lp-terminal-bar i { width: 8px; height: 8px; border-radius: 50%; background: rgba(126,151,188,0.3); }
.lp-terminal-bar span { margin-left: 8px; font-family: var(--mono); font-size: 10.5px; color: #7E97BC; }
.lp-terminal pre {
  padding: 16px 18px; margin: 0;
  font-family: var(--mono); font-size: 12px; line-height: 1.9;
  color: #C7D5EA; white-space: pre-wrap; word-break: break-word;
}
.lp-t-prompt { color: #6E92C9; }
.lp-t-dim { color: #7E97BC; }
.lp-t-cursor { animation: lpBlink 1.1s steps(1) infinite; color: #6E92C9; }

/* steps */
.lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 56px; max-width: 1000px; margin: 0 auto; }
.lp-step { border-top: 2px solid var(--ink); padding-top: 20px; }
.lp-step-n { font-family: var(--mono); font-size: 11.5px; color: var(--mocha); letter-spacing: 0.1em; }
.lp-step h3 { margin-top: 10px; }
.lp-step p { margin-top: 9px; font-size: 14.5px; line-height: 1.6; color: var(--ink-soft); }
@media (max-width: 720px) { .lp-steps { grid-template-columns: 1fr; gap: 34px; } }

/* pricing */
.lp-plans { display: grid; grid-template-columns: repeat(2, minmax(0, 340px)); gap: 20px; justify-content: center; margin-top: 60px; }
.lp-plan {
  position: relative; background: var(--card);
  border: 1px solid var(--line); border-radius: 18px; padding: 30px 28px;
}
.lp-plan-pro { border-color: var(--mocha); box-shadow: 0 24px 60px -20px rgba(141,111,76,0.35); }
.lp-plan-flag {
  position: absolute; top: -11px; right: 24px;
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase;
  background: var(--mocha); color: #FBFAF7; border-radius: 999px; padding: 3.5px 10px;
}
.lp-plan h3 { font-family: var(--display); font-size: 17px; font-weight: 650; }
.lp-price { margin-top: 12px; font-family: var(--display); font-size: 40px; font-weight: 700; letter-spacing: -0.03em; }
.lp-price span { font-size: 13.5px; font-weight: 400; color: var(--ink-mute); letter-spacing: 0; font-family: var(--body); }
.lp-plan-blurb { margin-top: 5px; font-size: 14px; color: var(--ink-soft); }
.lp-plan ul { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
.lp-plan li {
  list-style: none; font-size: 14px; color: var(--ink-soft);
  padding-left: 16px; position: relative;
}
.lp-plan li::before {
  content: ""; position: absolute; left: 0; top: 8px;
  width: 6px; height: 6px; border-radius: 2px; background: var(--mocha);
}
@media (max-width: 680px) { .lp-plans { grid-template-columns: minmax(0, 400px); } }

/* closer + footer */
.lp-closer { text-align: center; padding: 130px 28px; }
.lp-closer-h { margin-bottom: 38px; }
.lp-footer { border-top: 1px solid var(--line); padding: 34px 28px; }
.lp-footer-inner {
  max-width: 1120px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
}
.lp-wordmark-sm { font-size: 15px; }
.lp-wordmark-sm .lp-logo-tile { width: 22px; height: 22px; font-size: 13px; border-radius: 6px; }
.lp-footer-spec { font-family: var(--mono); font-size: 10.5px; color: var(--ink-mute); line-height: 2; }
.lp-swatch-i {
  display: inline-block; width: 9px; height: 9px; border-radius: 3px;
  border: 1px solid var(--line); vertical-align: -1px; margin: 0 1px;
}
.lp-footer-copy { font-size: 12px; color: var(--ink-mute); }

/* ── motion ── */
.lp-rise { opacity: 0; transform: translateY(16px); animation: lpRise 0.75s cubic-bezier(0.22,1,0.36,1) forwards; }
.lp-d1 { animation-delay: 0.08s; }
.lp-d2 { animation-delay: 0.16s; }
.lp-d3 { animation-delay: 0.24s; }
.lp-d4 { animation-delay: 0.38s; }
@keyframes lpRise { to { opacity: 1; transform: none; } }
@keyframes lpFade { to { opacity: 1; } }
@keyframes lpPin { to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes lpBlink { 50% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .lp-rise, .lp-note, .mk-chip { animation: none; opacity: 1; transform: none; }
  .lp-t-cursor, .mk-term-cursor { animation: none; }
  .lp * { transition: none !important; }
}
`;
