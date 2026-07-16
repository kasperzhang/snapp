import Link from "next/link";

/* Shared frame for the legal pages: marketing nav, prose column, footer with
   cross-links. Server component; inherits the global warm tokens. */
export function LegalShell({
  title,
  effective,
  children,
}: {
  title: string;
  effective: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <nav className="mx-auto flex h-[62px] max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--brand)] text-[13px] text-white">
              s
            </span>
            snapp
          </Link>
          <Link
            href="/"
            className="text-[13.5px] text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
          >
            Back to snapp
          </Link>
        </nav>
      </header>

      <main className="legal mx-auto max-w-3xl px-6 pb-24 pt-14">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-2 font-mono text-[11.5px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Effective {effective}
        </p>
        <div className="mt-10">{children}</div>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-[13px] text-[var(--text-muted)]">
          <span>© {new Date().getFullYear()} snapp</span>
          <span className="flex gap-5">
            <Link href="/terms" className="hover:text-[var(--foreground)]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)]">
              Privacy
            </Link>
            <Link href="/refunds" className="hover:text-[var(--foreground)]">
              Refunds
            </Link>
          </span>
        </div>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
.legal h2 {
  font-family: var(--font-display), sans-serif;
  font-size: 19px; font-weight: 650; letter-spacing: -0.01em;
  margin: 34px 0 10px;
}
.legal p { margin: 0 0 14px; font-size: 15px; line-height: 1.7; color: var(--text-secondary); }
.legal ul { margin: 0 0 14px; padding-left: 22px; list-style: disc; }
.legal li { margin: 6px 0; font-size: 15px; line-height: 1.65; color: var(--text-secondary); }
.legal strong { color: var(--foreground); font-weight: 600; }
.legal a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
`,
        }}
      />
    </div>
  );
}
