import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "../../_shell/MarketingShell";
import { TOOL_MARKS } from "@/components/marketing/ToolLogos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design for vibe coding — why AI-built apps look the same",
  description:
    "Vibe-coded apps ship fast and land on the same purple-gradient default. The reason isn't the model — it's that nobody gave it a reference. Here's how to fix that.",
  alternates: { canonical: "/for/vibe-coding" },
};

export default function VibeCodingPage() {
  return (
    <MarketingShell anchors={false}>
      <article className="lp-article">
        <p className="lp-eyebrow">Vibe coding</p>
        <h1 className="lp-h1 lp-article-h1">
          Why everything you vibe-code looks the same.
        </h1>
        <p className="lp-article-lede">
          You describe an app, the agent builds it, and it works. It also looks
          like every other app built that week: a violet gradient, Inter, cards
          with a 12px radius, a hero that could belong to anything. The code is
          fine. The taste is missing.
        </p>

        <h2>The model isn&apos;t guessing badly. It&apos;s guessing.</h2>
        <p>
          Ask for &ldquo;a clean, modern landing page&rdquo; and you&apos;ve
          given a spec that a million pages satisfy. With nothing to anchor to,
          the model returns the statistical centre of everything it has seen —
          which is exactly the aesthetic you recognise and can&apos;t place.
          It&apos;s not a failure of capability. You asked for the average and
          got it.
        </p>

        <h2>&ldquo;Make it look better&rdquo; is where the loop dies</h2>
        <p>
          So you iterate. Warmer. Less corporate. More editorial. Each round
          moves things sideways, because none of those words carry a hex value,
          a font stack, or a spacing rule. You know precisely which sites
          you&apos;re thinking of. You just can&apos;t type them fast enough,
          and the agent forgets by the next file anyway.
        </p>

        <h2>Point at references instead of describing them</h2>
        <p>
          The fix isn&apos;t better adjectives — it&apos;s a reference. Every
          designer works from them; the agent is the only one in the room
          without any. Give it three real sites and say which part of each you
          want, and the vagueness disappears: this one&apos;s typography, that
          one&apos;s palette, the third one&apos;s motion.
        </p>
        <p>
          That&apos;s what snapp does. You save the sites you wish you&apos;d
          made, tag what to borrow from each, and it writes one design guide —
          real font stacks, hex values with roles, a spacing scale, component
          rules, motion notes — that pastes into your agent and holds across
          the whole project.
        </p>

        <h2>What a usable spec contains</h2>
        <ul className="lp-article-list">
          <li>
            <strong>Typography</strong> with actual families, weights and
            fallbacks — not &ldquo;a modern sans&rdquo;.
          </li>
          <li>
            <strong>Colour</strong> as hex values with roles attached:
            background, surface, text, accent, border.
          </li>
          <li>
            <strong>Spacing and shape</strong> — a scale, container widths, a
            radius rule the agent can apply consistently.
          </li>
          <li>
            <strong>Motion</strong> described in durations and easings rather
            than &ldquo;smooth&rdquo;.
          </li>
          <li>
            <strong>Attribution</strong>, so you can see which decision came
            from which reference and change your mind later.
          </li>
        </ul>

        <h2>It works wherever you build</h2>
        <p>
          The output is Markdown, so it isn&apos;t tied to a tool — paste it
          into a chat, or drop it in a <code>CLAUDE.md</code> or{" "}
          <code>.cursorrules</code> file so every future prompt inherits it.
        </p>
        <div className="lp-agents">
          <span>Works with</span>
          <span className="lp-tools">
            {TOOL_MARKS.map(({ name, Mark }) => (
              <span key={name} className="lp-tool" title={name}>
                <Mark className="lp-tool-mark" />
                {name}
              </span>
            ))}
          </span>
        </div>

        <div className="lp-article-cta">
          <Link href="/signup" className="lp-btn lp-btn-primary">
            Start saving free
          </Link>
          <p className="lp-hero-note">
            Free forever for bookmarking · No card required
          </p>
        </div>
      </article>
    </MarketingShell>
  );
}
