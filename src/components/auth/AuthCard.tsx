import { LogoMark } from "@/components/ui/Logo";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /* Sits in a tinted, hairline-separated tray under the form — where the
     secondary path (OAuth) and the cross-link to the other page live. */
  footer?: React.ReactNode;
}

/* The shell every auth screen shares: soft mark top-left, left-aligned
   heading, form, then a quieter tray. Left alignment (rather than the usual
   centred stack) keeps it reading as a considered moment instead of a form. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rise-in overflow-hidden rounded-[20px] border border-[var(--border-light)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(34,28,21,0.04),0_16px_44px_-16px_rgba(34,28,21,0.14)]">
          <div className="p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--brand-tint)]">
              <LogoMark className="h-5 w-5 text-[var(--brand)]" />
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--foreground)]">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              {subtitle}
            </p>
            <div className="mt-6">{children}</div>
          </div>

          {footer && (
            <div className="border-t border-[var(--border-light)] bg-[var(--sidebar)] px-7 py-5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
