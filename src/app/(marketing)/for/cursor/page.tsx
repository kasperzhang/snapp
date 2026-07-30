import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "../../_shell/MarketingShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Give Cursor a design system it will actually follow",
  description:
    "Cursor holds your architecture rules across a whole repo but re-invents the UI every file. The gap is that .cursorrules describes code, not design. Here's how to close it.",
  alternates: { canonical: "/for/cursor" },
};

export default function CursorPage() {
  return (
    <MarketingShell anchors={false}>
      <article className="lp-article">
        <p className="lp-eyebrow">Cursor</p>
        <h1 className="lp-h1 lp-article-h1">
          Give Cursor a design system it will hold to.
        </h1>
        <p className="lp-article-lede">
          Cursor is disciplined about code. Tell it your state management
          convention and it will respect that across fifty files. Tell it to
          make something &ldquo;feel premium&rdquo; and every component arrives
          with a slightly different idea of what that means.
        </p>

        <h2>Why rules files handle code but not design</h2>
        <p>
          A <code>.cursorrules</code> file works because engineering
          conventions are already written in specifics — use this library,
          never that pattern, put files here. Design conventions usually
          aren&apos;t. &ldquo;Clean and minimal&rdquo; survives one component
          and drifts by the next, because there&apos;s nothing in it to check
          against.
        </p>

        <h2>Composer amplifies the drift</h2>
        <p>
          Multi-file edits are where it shows. Composer touches eight files at
          once; without a fixed palette and scale in context, each one gets an
          independently reasonable answer. You end up with three greys that are
          nearly the same, two radii, and a button that doesn&apos;t match the
          button one directory over.
        </p>

        <h2>Put the design system in the rules file</h2>
        <p>
          The thing that makes architecture rules work — concrete values,
          stated once, always in context — works for design too. It just needs
          the values to exist first.
        </p>
        <p>
          snapp produces them from references rather than from a blank page.
          Save a few sites whose look you want, tag which aspect to take from
          each, and it writes a guide with real font stacks, hex values and
          their roles, a spacing scale, radii, and motion timings. Paste that
          into <code>.cursorrules</code> and every subsequent prompt inherits
          it — including Composer&apos;s.
        </p>

        <h2>How to set it up</h2>
        <ol className="lp-article-list">
          <li>
            Save three or four sites whose design you&apos;d be happy to be
            compared to.
          </li>
          <li>
            Tag what to borrow from each — typography here, colour there,
            motion from a third.
          </li>
          <li>
            Add a note about what you&apos;re building so the guide is written
            for your project rather than in the abstract.
          </li>
          <li>
            Generate, copy, and paste into <code>.cursorrules</code> under a{" "}
            <code>## Design system</code> heading.
          </li>
        </ol>
        <p>
          From then on &ldquo;make this match our design system&rdquo; is a
          checkable instruction rather than a hopeful one.
        </p>

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
