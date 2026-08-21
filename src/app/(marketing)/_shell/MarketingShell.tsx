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
          <Link href="/" className="lp-wordmark lp-wordmark-sm">
            <span className="lp-logo-tile">
              <LogoMark />
            </span>
            <span>snapp</span>
          </Link>
          <p className="lp-footer-spec">
            This page&apos;s guide — porcelain{" "}
            <i className="lp-swatch-i" style={{ background: "#FBFAF7" }} /> #FBFAF7 ·
            espresso <i className="lp-swatch-i" style={{ background: "#221C15" }} />{" "}
            #221C15 · mocha{" "}
            <i className="lp-swatch-i" style={{ background: "#8D6F4C" }} /> #8D6F4C ·
            set in Bricolage Grotesque &amp; Geist. Guided by snapp.
          </p>
          <p className="lp-footer-copy">
            © {new Date().getFullYear()} snapp ·{" "}
            <Link href="/terms" className="lp-footer-link">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="lp-footer-link">
              Privacy
            </Link>{" "}
            ·{" "}
            <Link href="/refunds" className="lp-footer-link">
              Refunds
            </Link>{" "}
            ·{" "}
            {/* The people most likely to hit a wall are the ones who couldn't
                sign up, and the in-app report is behind the login they never
                got through. A plain mailto needs no JavaScript and works on
                every page this shell renders. */}
            <a
              href="mailto:kasperzhang.ai@gmail.com?subject=snapp%20bug%20report&body=What%20happened%3F%0A%0A%0AWhat%20did%20you%20expect%20instead%3F%0A%0A%0AWhich%20page%20and%20browser%3F%0A"
              className="lp-footer-link"
            >
              Report a bug
            </a>
          </p>
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
