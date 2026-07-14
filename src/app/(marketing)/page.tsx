import Link from "next/link";
import { Zap, Image as ImageIcon, Tags, LayoutGrid, Check, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The twelve things you can borrow from a site (mirrors DESIGN_ASPECTS), each
// given a hue so color itself becomes the brand metaphor: many palettes → one.
const ASPECTS: { label: string; hue: string }[] = [
  { label: "Typography", hue: "#141414" },
  { label: "Color", hue: "#D96C7A" },
  { label: "Background", hue: "#E8A13A" },
  { label: "Layout", hue: "#4B82E8" },
  { label: "Spacing", hue: "#6F6F6B" },
  { label: "Components", hue: "#7C6BD6" },
  { label: "Depth & Shape", hue: "#3FA89B" },
  { label: "Animation", hue: "#E8A13A" },
  { label: "Motion & Scroll", hue: "#4B82E8" },
  { label: "Imagery", hue: "#D96C7A" },
  { label: "Iconography", hue: "#7C6BD6" },
  { label: "Vibe", hue: "#3FA89B" },
];

// Placeholder library for the hero — reads as "sites a designer collected".
const BOOKMARKS: { title: string; domain: string; hue: string }[] = [
  { title: "Aurora Studio", domain: "aurora.studio", hue: "#4B82E8" },
  { title: "Field Notes", domain: "fieldnotes.co", hue: "#E8A13A" },
  { title: "Monolith", domain: "monolith.design", hue: "#141414" },
  { title: "Halcyon", domain: "halcyon.app", hue: "#D96C7A" },
  { title: "Praxis", domain: "praxis.dev", hue: "#3FA89B" },
  { title: "Kessler & Co", domain: "kessler.co", hue: "#7C6BD6" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "One-click save",
    body: "Paste a URL and it's in your library. No folders to fuss with, no friction.",
  },
  {
    icon: ImageIcon,
    title: "Rich previews",
    body: "Every bookmark shows a real preview and favicon — a wall of sites, not a list of blue links.",
  },
  {
    icon: Tags,
    title: "Tags & search",
    body: "Group by project, mood, or whatever you invent. Find any site in a keystroke.",
  },
  {
    icon: LayoutGrid,
    title: "Made to look at",
    body: "A big, visual grid that feels like a moodboard you actually want to open.",
  },
];

// Big supporting stats under the 90% headline.
const STATS = [
  { big: "12", small: "design aspects to borrow from any site" },
  { big: "1", small: "clean brief, pulled from every source at once" },
  { big: "0", small: "design experience required to use it" },
];

// snapp vs a generic bookmark tool.
const COMPARE: { label: string; snapp: boolean; other: boolean }[] = [
  { label: "Save, tag & search any site", snapp: true, other: true },
  { label: "Big, visual previews — not blue links", snapp: true, other: false },
  { label: "Pulls the real fonts & colors from a page", snapp: true, other: false },
  { label: "Turns saved sites into a design brief", snapp: true, other: false },
  { label: "Built to hand off to AI coding agents", snapp: true, other: false },
  { label: "Free to start", snapp: true, other: true },
];

const STEPS = [
  {
    n: "01",
    title: "Save",
    body: "Bookmark any site you love. snapp captures its preview, colors, and fonts — free.",
  },
  {
    n: "02",
    title: "Compose",
    body: "Drop your favorites into a Workbench and tag what to borrow from each one.",
  },
  {
    n: "03",
    title: "Brief",
    body: "snapp writes one design brief — type, color, spacing, components — to paste into your coding agent.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;

  const display = "font-[family-name:var(--font-space-grotesk)]";
  const mono = "font-[family-name:var(--font-geist-mono)]";
  const eyebrow = `${mono} text-[11.5px] uppercase tracking-[0.2em] text-[var(--text-muted)]`;

  return (
    <div className="lp-root min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <style>{lpCss}</style>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/70 bg-[var(--background)]/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--foreground)] text-[15px] font-bold text-white">
              s
            </span>
            <span className={`${display} text-lg font-semibold tracking-tight`}>snapp</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#library" className="text-[13.5px] text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]">
              Bookmarks
            </a>
            <a href="#workbench" className="text-[13.5px] text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]">
              Workbench
            </a>
            <a href="#pricing" className="text-[13.5px] text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            {loggedIn ? (
              <Link href="/app" className="rounded-full bg-[var(--brand)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)]">
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden px-2 text-[13.5px] text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)] sm:block">
                  Log in
                </Link>
                <Link href="/signup" className="rounded-full bg-[var(--brand)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)]">
                  Start free
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="lp-grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pb-28 md:pt-24">
          <div>
            <div className="lp-rise mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-2 pr-3.5 text-[12.5px] font-medium text-[var(--text-secondary)]">
              <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[11px] text-white">
                90% faster
              </span>
              than describing your design by hand
            </div>
            <h1 className={`lp-rise lp-d1 ${display} text-[clamp(2.9rem,6.6vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.03em]`}>
              <span className="text-[var(--text-muted)]">Save the sites you love.</span>{" "}
              Then show your AI the{" "}
              <span className="text-[var(--brand)]">vibe</span>.
            </h1>
            <p className="lp-rise lp-d2 mt-7 max-w-lg text-[18px] leading-relaxed text-[var(--text-secondary)]">
              snapp is a beautiful bookmark app for the sites that inspire you.
              Collect them free — then turn your favorites into a design brief your
              coding agent can actually follow.
            </p>
            <div className="lp-rise lp-d3 mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={loggedIn ? "/app" : "/signup"}
                className="rounded-full bg-[var(--brand)] px-7 py-3.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-[var(--brand-hover)]"
              >
                {loggedIn ? "Open snapp" : "Start free"}
              </Link>
              <a href="#workbench" className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-7 py-3.5 text-[15px] font-medium text-[var(--foreground)] transition-colors hover:border-[var(--text-muted)]">
                See how it works
              </a>
            </div>
            <p className="lp-rise lp-d3 mt-4 text-[13px] text-[var(--text-muted)]">
              Free forever for bookmarking. No card required.
            </p>
          </div>

          {/* Hero visual: the library */}
          <div className="lp-rise lp-d4">
            <BookmarkWall />
          </div>
        </div>
      </section>

      {/* ── Big stat (editorial, light) ─────────────────────── */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-10 md:grid-cols-[auto_1fr] md:gap-16">
            <div className={`${display} text-[clamp(6rem,15vw,12rem)] font-semibold leading-[0.8] tracking-[-0.05em]`}>
              90<span className="text-[var(--brand)]">%</span>
            </div>
            <div className="md:border-l md:border-[var(--border)] md:pl-16">
              <p className={`${eyebrow} mb-4`}>Why designers switch</p>
              <p className={`${display} max-w-lg text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.01em]`}>
                less time spent getting your vibe-coded app to look right.
              </p>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[var(--text-secondary)]">
                Stop typing paragraph after paragraph of &ldquo;make it more
                modern&rdquo; into Cursor. Point at the sites you already love and let
                snapp write the spec.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-8 border-t border-[var(--border)] pt-12 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.small}>
                <div className={`${display} text-[clamp(2.5rem,5vw,3.5rem)] font-semibold leading-none tracking-[-0.02em]`}>
                  {s.big}
                </div>
                <p className="mt-3 max-w-[16rem] text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  {s.small}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free: the bookmark experience ───────────────────── */}
      <section id="library" className="border-t border-[var(--border)] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <p className={`${eyebrow} mb-3`}>Free forever</p>
          <h2 className={`${display} max-w-2xl text-[clamp(2rem,4.2vw,3.1rem)] font-semibold tracking-[-0.01em]`}>
            First, the nicest place to keep the sites you love.
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--text-secondary)]">
            Before it&apos;s a design tool, snapp is just a genuinely good bookmark
            app — the kind you&apos;ll want to open. Saving and organizing is free,
            always.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--background)] text-[var(--foreground)]">
                  <f.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </div>
                <h3 className={`${display} mt-5 text-[16px] font-semibold`}>{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pro: the workbench (the vibe-coder payoff) ──────── */}
      <section id="workbench" className="border-t border-[var(--border)] bg-[var(--surface)] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2">
              <span className={`${eyebrow}`}>Workbench</span>
              <span className={`${mono} rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white`}>
                Pro
              </span>
            </div>
            <h2 className={`${display} text-[clamp(2rem,4.2vw,3.1rem)] font-semibold leading-[1.1] tracking-[-0.01em]`}>
              You can picture the look. You just can&apos;t describe it to your AI.
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Vibe coding falls apart at &ldquo;make it look good.&rdquo; You know the
              sites you want it to feel like — you just can&apos;t turn that into words
              Cursor or Claude will get right. So point instead of describe: drop your
              bookmarks into a Workbench, mark what to borrow from each, and snapp writes
              one design brief — fonts, colors, spacing, components — ready to paste into
              your agent.
            </p>
            <p className={`${mono} mt-5 text-[12.5px] text-[var(--text-muted)]`}>
              Works with Cursor · Claude · v0 · Lovable · Bolt — anything that takes a prompt.
            </p>
          </div>

          <div className="mt-14">
            <SynthesisDiagram display={display} mono={mono} />
          </div>

          {/* what you borrow */}
          <div className="mt-16 grid items-start gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className={`${eyebrow} mb-3`}>Pick what matters</p>
              <h3 className={`${display} text-[clamp(1.4rem,2.5vw,1.9rem)] font-semibold tracking-[-0.01em]`}>
                Borrow a font here, a gradient there.
              </h3>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Every site is a menu. Take one piece or the whole feel — snapp only
                pulls what you tag, so the result is yours, not a clone.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ASPECTS.map((a) => (
                <span key={a.label} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[14px] text-[var(--foreground)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.hue }} />
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ──────────────────────────────────────── */}
      <section className="border-t border-[var(--border)] py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-6">
          <p className={`${eyebrow} mb-3`}>How snapp compares</p>
          <h2 className={`${display} max-w-2xl text-[clamp(2rem,4.2vw,3.1rem)] font-semibold tracking-[-0.015em]`}>
            A bookmark app that actually does something with your bookmarks.
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--text-secondary)]">
            Tools like Bookmarkify store your links. snapp turns them into something
            your coding agent can build from.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--border)]">
            <div className="grid grid-cols-[1.7fr_1fr_1fr]">
              <div className="p-4 md:p-5" />
              <div className="bg-[var(--brand)] p-4 text-center md:p-5">
                <span className={`${display} text-[15px] font-semibold text-white md:text-[17px]`}>
                  snapp
                </span>
              </div>
              <div className="p-4 text-center md:p-5">
                <span className="text-[14px] text-[var(--text-secondary)] md:text-[15px]">
                  Bookmarkify
                </span>
              </div>
            </div>
            {COMPARE.map((r) => (
              <div key={r.label} className="grid grid-cols-[1.7fr_1fr_1fr] items-center border-t border-[var(--border)]">
                <div className="p-4 text-[13.5px] text-[var(--foreground)] md:p-5 md:text-[15px]">
                  {r.label}
                </div>
                <div className="flex justify-center bg-[var(--brand)]/[0.07] p-4 md:p-5">
                  {r.snapp ? (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--brand)] text-white">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <Minus className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex justify-center p-4 md:p-5">
                  {r.other ? (
                    <Check className="h-[18px] w-[18px] text-[var(--text-secondary)]" strokeWidth={2.2} />
                  ) : (
                    <Minus className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="border-t border-[var(--border)] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <p className={`${eyebrow} mb-3`}>How it works</p>
          <h2 className={`${display} max-w-xl text-[clamp(2rem,4.2vw,3.1rem)] font-semibold tracking-[-0.01em]`}>
            From a pile of tabs to a brief in three steps.
          </h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-[var(--surface)] p-8">
                <div className={`${mono} text-[13px] text-[var(--text-muted)]`}>{s.n}</div>
                <h3 className={`${display} mt-6 text-xl font-semibold`}>{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-[var(--border)] bg-[var(--surface)] py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <p className={`${eyebrow} mb-3 text-center`}>Pricing</p>
          <h2 className={`${display} text-center text-[clamp(2rem,4.2vw,3.1rem)] font-semibold tracking-[-0.01em]`}>
            Bookmark free. Brief on Pro.
          </h2>

          <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
            <PlanCard
              display={display}
              mono={mono}
              name="Free"
              price="$0"
              blurb="The full bookmark app, forever."
              features={[
                "Unlimited bookmarks",
                "Rich previews, favicons & tags",
                "Instant search & a visual grid",
                "5 design briefs to try the Workbench",
              ]}
              cta={loggedIn ? "Open app" : "Start free"}
              href={loggedIn ? "/app" : "/signup"}
            />
            <PlanCard
              display={display}
              mono={mono}
              featured
              name="Pro"
              price="$12"
              suffix="/mo"
              blurb="The Workbench, unlocked."
              features={[
                "Everything in Free",
                "200 design briefs / month",
                "1,000 site analyses / month",
                "Priority generation",
              ]}
              cta={loggedIn ? "Go Pro" : "Start free"}
              href={loggedIn ? "/app" : "/signup"}
            />
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────── */}
      <section className="border-t border-[var(--border)] py-24 text-center md:py-28">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className={`${display} text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em]`}>
            Collect the vibe.
            <br />
            Ship the vibe.
          </h2>
          <Link
            href={loggedIn ? "/app" : "/signup"}
            className="mt-9 inline-block rounded-full bg-[var(--brand)] px-7 py-3.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-[var(--brand-hover)]"
          >
            {loggedIn ? "Open snapp" : "Start free"}
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--foreground)] text-[12px] font-bold text-white">s</span>
            <span className={`${display} font-semibold`}>snapp</span>
          </div>
          <p className="text-[13px] text-[var(--text-muted)]">
            © {new Date().getFullYear()} snapp — bookmarks with a designer&apos;s eye.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────── sub-components ───────────────────────── */

function BookmarkWall() {
  const col = (items: typeof BOOKMARKS, offset = false) => (
    <div className={`space-y-4 ${offset ? "sm:pt-10" : ""}`}>
      {items.map((b) => (
        <BookmarkCard key={b.domain} {...b} />
      ))}
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-4">
      {col(BOOKMARKS.slice(0, 3), true)}
      {col(BOOKMARKS.slice(3, 6))}
    </div>
  );
}

function BookmarkCard({
  title,
  domain,
  hue,
}: {
  title: string;
  domain: string;
  hue: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="p-3">
        {/* mini-browser thumbnail — muted, restrained accent */}
        <div className="overflow-hidden rounded-lg bg-[var(--background)] ring-1 ring-[var(--border-light)]">
          <div className="flex items-center gap-1 border-b border-[var(--border-light)] px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
          </div>
          <div className="p-2.5">
            <div className="flex items-center justify-between">
              <div className="h-1.5 w-10 rounded-full bg-[var(--border)]" />
              <div className="h-2.5 w-8 rounded-full" style={{ background: `${hue}26` }} />
            </div>
            <div className="mt-2.5 h-2 w-[70%] rounded-full bg-[var(--border-light)]" />
            <div className="mt-1.5 h-2 w-[45%] rounded-full bg-[var(--border-light)]" />
            <div className="mt-2.5 h-5 w-14 rounded-md" style={{ background: hue }} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border)] px-3 py-2.5">
        <div className="h-5 w-5 shrink-0 rounded-md" style={{ background: hue }} />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium text-[var(--foreground)]">{title}</div>
          <div className="truncate text-[11px] text-[var(--text-muted)]">{domain}</div>
        </div>
      </div>
    </div>
  );
}

function SynthesisDiagram({ display, mono }: { display: string; mono: string }) {
  return (
    <div className="grid items-center gap-8 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-6 md:grid-cols-[1fr_auto_1.1fr] md:p-10">
      {/* Sources */}
      <div className="relative">
        <p className={`${mono} mb-4 text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]`}>
          Your bookmarks
        </p>
        <div className="relative h-[188px]">
          <MiniSite className="absolute left-0 top-0 w-[62%] -rotate-2" bar="#4B82E8" />
          <MiniSite className="absolute right-0 top-5 w-[62%] rotate-3" bar="#D96C7A" />
          <MiniSite className="absolute bottom-0 left-6 w-[62%] rotate-1" bar="#E8A13A" />
          <span className="absolute -right-1 bottom-1 max-w-[130px] -rotate-6 text-[14px] leading-tight text-[var(--text-secondary)] font-[family-name:var(--font-playpen)]">
            love the slow fade-in on scroll
          </span>
        </div>
      </div>

      {/* Chips (the borrow) */}
      <div className="flex flex-row items-center justify-center gap-2 md:flex-col md:items-stretch">
        {[
          { label: "Typography", hue: "#141414" },
          { label: "Color", hue: "#D96C7A" },
          { label: "Motion", hue: "#4B82E8" },
        ].map((c) => (
          <span key={c.label} className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-3.5 py-1.5 text-[12.5px] font-medium text-white">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.hue === "#141414" ? "#fff" : c.hue }} />
            {c.label}
          </span>
        ))}
        <span className="hidden text-[var(--text-muted)] md:mt-1 md:block md:text-center">↓</span>
      </div>

      {/* Guide output */}
      <GuideCard display={display} mono={mono} />
    </div>
  );
}

function MiniSite({ className, bar }: { className?: string; bar: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] ${className}`}>
      <div className="h-6 w-full" style={{ background: bar }} />
      <div className="space-y-1.5 p-3">
        <div className="h-2 w-3/4 rounded-full bg-[var(--border-light)]" />
        <div className="h-2 w-1/2 rounded-full bg-[var(--border-light)]" />
        <div className="mt-2 flex gap-1.5">
          <div className="h-6 w-6 rounded-md bg-[var(--border-light)]" />
          <div className="h-6 flex-1 rounded-md bg-[var(--border-light)]" />
        </div>
      </div>
    </div>
  );
}

function GuideCard({ display, mono }: { display: string; mono: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card-hover)]">
      <div className={`${mono} text-[10.5px] uppercase tracking-[0.15em] text-[var(--text-muted)]`}>
        Design brief · paste into your agent
      </div>
      <div className={`${display} mt-2 text-xl font-semibold tracking-tight`}>Warm Editorial</div>

      <div className="mt-5 flex gap-1.5">
        {["#141414", "#FBFBFA", "#8D6F4C", "#D96C7A", "#E8A13A"].map((c) => (
          <div key={c} className="h-8 flex-1 rounded-md border border-[var(--border)]" style={{ background: c }} />
        ))}
      </div>

      <div className="mt-5 flex items-baseline gap-3 border-t border-[var(--border)] pt-4">
        <span className={`${display} text-3xl font-semibold`}>Aa</span>
        <div className="text-[12px] text-[var(--text-secondary)]">
          <div className={display}>Space Grotesk · Display</div>
          <div>Geist · Body</div>
        </div>
      </div>

      <div className={`${mono} mt-5 rounded-lg bg-[var(--background)] px-3 py-2 text-[11.5px] text-[var(--text-secondary)]`}>
        <span className="text-[var(--text-muted)]">--accent</span>: #8D6F4C;
      </div>
    </div>
  );
}

function PlanCard({
  display,
  mono,
  name,
  price,
  suffix,
  blurb,
  features,
  cta,
  href,
  featured = false,
}: {
  display: string;
  mono: string;
  name: string;
  price: string;
  suffix?: string;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-7 ${
        featured
          ? "border-[var(--brand)] bg-[var(--background)] shadow-[var(--shadow-card-hover)]"
          : "border-[var(--border)] bg-[var(--background)]"
      }`}
    >
      {featured && (
        <span className={`${mono} absolute -top-2.5 right-6 rounded-full bg-[var(--brand)] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white`}>
          Most popular
        </span>
      )}
      <div className={`${display} text-lg font-semibold`}>{name}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className={`${display} text-4xl font-semibold tracking-tight`}>{price}</span>
        {suffix && <span className="text-[14px] text-[var(--text-muted)]">{suffix}</span>}
      </div>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">{blurb}</p>

      <ul className="mt-6 space-y-2.5 text-[14px] text-[var(--text-secondary)]">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--foreground)]" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`mt-7 block rounded-full py-2.5 text-center text-[14px] font-medium transition-colors ${
          featured
            ? "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]"
            : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--text-muted)]"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

/* Scoped landing CSS: load animation, hero grid, underline accent. */
const lpCss = `
.lp-root .lp-rise { opacity: 0; transform: translateY(14px); animation: lpRise 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
.lp-root .lp-d1 { animation-delay: 0.06s; }
.lp-root .lp-d2 { animation-delay: 0.12s; }
.lp-root .lp-d3 { animation-delay: 0.18s; }
.lp-root .lp-d4 { animation-delay: 0.26s; }
@keyframes lpRise { to { opacity: 1; transform: none; } }

.lp-root .lp-grid-bg {
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 26px 26px;
  background-position: -13px -13px;
  -webkit-mask-image: linear-gradient(to bottom, black, transparent 80%);
  mask-image: linear-gradient(to bottom, black, transparent 80%);
}

.lp-root .lp-underline {
  background-image: linear-gradient(120deg, #4B82E8, #7C6BD6 40%, #D96C7A 75%, #E8A13A);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .lp-root .lp-rise { animation: none; opacity: 1; transform: none; }
}
`;
