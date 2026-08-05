"use client";

import { Check, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  PLANS,
  PURCHASABLE_PLANS,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";

/* What each plan actually gives you, in the order it matters to someone
   deciding. Derived from PLANS where possible so the numbers can't drift from
   what the server enforces; the qualitative lines are spelled out here. */
function featuresFor(id: PlanId): string[] {
  const p = PLANS[id];
  const guides =
    id === "free"
      ? "1 design guide, to try it"
      : `${p.limits.guide} design guides a month`;
  const scans =
    id === "free" ? `${p.limits.scan} site scans a month` : "Unlimited site scans";

  const extra: Record<PlanId, string[]> = {
    free: ["Unlimited bookmarks, tags & search"],
    lite: ["Unlimited bookmarks, tags & search", "Mix up to 8 sources"],
    pro: ["Everything in Lite", "Priority generation"],
    studio: ["Everything in Pro", "Bring your own Anthropic key"],
  };

  return [guides, scans, ...extra[id]];
}

interface PlanCardsProps {
  currentPlan: PlanId;
  interval: BillingInterval;
  onIntervalChange: (i: BillingInterval) => void;
  /** Null when the user has no Stripe subscription — they check out instead. */
  hasSubscription: boolean;
  onChoose: (plan: PlanId) => void;
  onManage: () => void;
  busy: PlanId | "portal" | null;
}

export function PlanCards({
  currentPlan,
  interval,
  onIntervalChange,
  hasSubscription,
  onChoose,
  onManage,
  busy,
}: PlanCardsProps) {
  // Free is shown for comparison but never sold, so the ladder reads top to
  // bottom even for someone already paying.
  const shown: PlanId[] = ["free", ...PURCHASABLE_PLANS.map((p) => p.id)];

  return (
    <div>
      {/* Interval toggle. Quarterly prices have existed since the billing
          rebuild but nothing offered them — this is the only place the saving
          is legible, so it belongs next to the cards rather than in a menu. */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--sidebar)] p-1">
          {(["monthly", "quarterly"] as BillingInterval[]).map((i) => (
            <button
              key={i}
              onClick={() => onIntervalChange(i)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] transition-colors",
                interval === i
                  ? "bg-[var(--surface)] font-medium text-[var(--foreground)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              )}
            >
              {i === "monthly" ? "Monthly" : "Quarterly"}
              {i === "quarterly" && (
                <span className="ml-1.5 text-[11px] text-[var(--accent)]">
                  save 10%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {shown.map((id) => {
          const plan = PLANS[id];
          const price = plan.prices[interval];
          const isCurrent = id === currentPlan;
          const highlight = id === "pro";

          return (
            <div
              key={id}
              className={cn(
                "relative rounded-[var(--radius-card)] border p-4",
                isCurrent
                  ? "border-[var(--brand)] bg-[var(--brand-tint)]"
                  : highlight
                    ? "border-[var(--border)] bg-[var(--surface)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface)]"
              )}
            >
              {isCurrent && (
                <span className="absolute -top-2 right-3 rounded bg-[var(--brand)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">
                  Current
                </span>
              )}

              <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[var(--foreground)]">
                {plan.name}
              </p>

              <p className="mt-1 text-[var(--foreground)]">
                <span className="text-[22px] font-semibold">
                  ${price ? price.perMonth.toFixed(2) : "0"}
                </span>
                <span className="text-[13px] text-[var(--text-secondary)]">
                  {" "}
                  / month
                </span>
              </p>
              {/* Quarterly bills as one payment; showing only the per-month
                  figure would misstate what gets charged today. */}
              <p className="mt-0.5 h-4 text-[11px] text-[var(--text-muted)]">
                {price && interval === "quarterly"
                  ? `$${price.amount.toFixed(2)} billed quarterly`
                  : ""}
              </p>

              <ul className="mt-3 space-y-1.5">
                {featuresFor(id).map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[var(--text-secondary)]"
                  >
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent)]" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                {isCurrent ? (
                  <Button variant="secondary" size="sm" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : id === "free" ? (
                  // Downgrading to Free means cancelling, which lives in the
                  // portal so Stripe can handle the end-of-period mechanics.
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={onManage}
                    loading={busy === "portal"}
                    disabled={!hasSubscription || busy !== null}
                  >
                    {hasSubscription ? "Cancel plan" : "—"}
                  </Button>
                ) : hasSubscription ? (
                  // Already subscribed: switching price on an existing
                  // subscription must go through the portal. Starting a second
                  // checkout would create a SECOND subscription and bill twice.
                  <Button
                    variant={highlight ? "primary" : "secondary"}
                    size="sm"
                    className="w-full"
                    onClick={onManage}
                    loading={busy === "portal"}
                    disabled={busy !== null}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Switch
                  </Button>
                ) : (
                  <Button
                    variant={highlight ? "primary" : "secondary"}
                    size="sm"
                    className="w-full"
                    onClick={() => onChoose(id)}
                    loading={busy === id}
                    disabled={busy !== null}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Choose {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
        A credit is one design guide — from a single site or a Mix of up to
        eight. Bookmarks and scans never use one.
      </p>
    </div>
  );
}
