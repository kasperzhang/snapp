import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/ui/Logo";
import { lpCss } from "./marketing-css";

/* Nav, stylesheet and footer for every marketing surface. The landing page
   and the /for/* pages differ only in what sits between them, and the nav
   needs the session either way — so the auth read lives here rather than
   being repeated per page. */
export async function MarketingShell({
  children,
  /* Section anchors only exist on the landing page; elsewhere the nav links
     back to it rather than to fragments that aren't on the current page. */
  anchors = true,
}: {
  children: React.ReactNode;
  anchors?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: lpCss }} />

      <header className="lp-nav">
        <nav className="lp-nav-inner">
          <Link href="/" className="lp-wordmark">
            <span className="lp-logo-tile">
              <LogoMark />
            </span>
            <span>snapp</span>
          </Link>
          <div className="lp-nav-links">
            <a href={anchors ? "#library" : "/#library"}>Library</a>
            <a href={anchors ? "#mix" : "/#mix"}>Mix</a>
            <a href={anchors ? "#pricing" : "/#pricing"}>Pricing</a>
            <Link href="/blog">Blog</Link>
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

      {children}

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          {/* Brand and wayfinding. The old footer had no navigation at all —
              a wordmark, one long caption and a legal row — so the page simply
              ended, with nowhere to go from the bottom of it. */}
          <div className="lp-footer-brand">
            <Link href="/" className="lp-wordmark lp-wordmark-sm">
              <span className="lp-logo-tile">
                <LogoMark />
              </span>
              <span>snapp</span>
            </Link>
            <p>
              Keep the sites you wish you&apos;d made. Turn them into one design
              guide your agent follows.
            </p>
            <Link
              href={loggedIn ? "/app" : "/signup"}
              className="lp-btn lp-btn-primary lp-btn-sm"
            >
              {loggedIn ? "Open snapp" : "Start free"}
            </Link>
          </div>

          <nav className="lp-footer-nav">
            <div>
              <h3>Product</h3>
              <a href={anchors ? "#library" : "/#library"}>Library</a>
              <a href={anchors ? "#mix" : "/#mix"}>The Mix</a>
              <a href={anchors ? "#pricing" : "/#pricing"}>Pricing</a>
              <Link href="/blog">Blog</Link>
            </div>
            <div>
              <h3>Company</h3>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/refunds">Refunds</Link>
              {/* The people most likely to hit a wall are the ones who never
                  got through signup, and the in-app reporter is behind it. A
                  plain mailto needs no JavaScript and rides on every surface
                  this shell renders. */}
              <a href="mailto:kasperzhang.ai@gmail.com?subject=snapp%20bug%20report&body=What%20happened%3F%0A%0A%0AWhat%20did%20you%20expect%20instead%3F%0A%0A%0AWhich%20page%20and%20browser%3F%0A">
                Report a bug
              </a>
            </div>
          </nav>
        </div>

        {/* The page printing its own guide is the most on-brand thing here, and
            it was set as a caption running off the edge. It gets the treatment
            a real guide section gets: an eyebrow, swatches as chips, the type
            credit on its own line. */}
        <div className="lp-footer-guide">
          <p className="lp-eyebrow">This page&apos;s guide</p>
          <div className="lp-footer-swatches">
            {[
              ["#FBFAF7", "porcelain"],
              ["#221C15", "espresso"],
              ["#8D6F4C", "mocha"],
            ].map(([hex, name]) => (
              <span key={hex} className="lp-footer-swatch">
                <i style={{ background: hex }} />
                {hex}
                <b>{name}</b>
              </span>
            ))}
          </div>
          <p className="lp-footer-type">
            Bricolage Grotesque display · Geist body · Geist Mono data — guided
            by snapp
          </p>
        </div>

        <div className="lp-footer-legal">
          <span>© {new Date().getFullYear()} snapp</span>
          <span>Made for people who point at things.</span>
        </div>
      </footer>
    </div>
  );
}

/** Shared CTA row — the same pair of buttons the hero and closer both use. */
export function MarketingCtas({
  loggedIn,
  secondary,
}: {
  loggedIn: boolean;
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="lp-hero-ctas">
      <Link
        href={loggedIn ? "/app" : "/signup"}
        className="lp-btn lp-btn-primary"
      >
        {loggedIn ? "Open snapp" : "Start saving free"}
      </Link>
      {secondary && (
        <a href={secondary.href} className="lp-btn lp-btn-ghost">
          {secondary.label}
        </a>
      )}
    </div>
  );
}
