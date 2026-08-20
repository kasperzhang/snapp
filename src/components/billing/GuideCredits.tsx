"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { guidesLeft, useBilling } from "@/hooks";
import { cn } from "@/lib/utils/cn";

const PLANS_HREF = "/settings?tab=plan";

/* How many guides are left, said where the guide is actually spent.

   Free is one guide — deliberately, it's the demo — but the counter lived
   inside the account menu, so the only way to learn that was to open a menu
   you had no reason to open. You'd spend it without knowing it was scarce and
   find out at the wall.

   Quiet by design: it says nothing at all when there's plenty left, and it
   never appears twice in one view. */
export function GuideCredits({ className }: { className?: string }) {
  const billing = useBilling();
  const left = guidesLeft(billing);
  if (!billing || left === null) return null;

  const { limit } = billing.usage.guide;
  const free = billing.plan === "free";
  // Nothing to say to someone with room to work.
  if (!free && left > 3) return null;

  if (left > 0) {
    return (
      <span
        className={cn("text-[12px] text-[var(--text-muted)]", className)}
      >
        {left} {free ? "free " : ""}
        {left === 1 ? "guide" : "guides"} left
        {free && limit === 1 ? "" : " this month"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]",
        className
      )}
    >
      {limit === 1
        ? "You've used your free guide."
        : "No guides left this month."}
      <Link
        href={PLANS_HREF}
        className="inline-flex items-center gap-1 font-medium text-[var(--accent)] underline-offset-2 hover:underline"
      >
        <Zap className="h-3 w-3" />
        See plans
      </Link>
    </span>
  );
}

/* A generation that was refused, with the way out attached. The API answers a
   402 with a real sentence; what was missing everywhere but the mix rail was
   anywhere to go from there. */
export function LimitNotice({
  message,
  overLimit,
  className,
}: {
  message: string;
  overLimit?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] border px-3 py-2.5 text-[13px]",
        overLimit
          ? "border-[var(--border)] bg-[var(--brand-tint)] text-[var(--foreground)]"
          : "border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger)]",
        className
      )}
    >
      <p className="leading-relaxed">{message}</p>
      {overLimit && (
        <Link
          href={PLANS_HREF}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Zap className="h-3 w-3" />
          See plans
        </Link>
      )}
    </div>
  );
}
