"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, type BillingInterval, type PlanId } from "@/lib/billing/plans";

/* The landing page's pricing cards.
   A client island inside an otherwise server-rendered page: the interval
   toggle needs state, and quarterly buried in a sentence ("$3.60/mo billed
   quarterly") is a discount nobody sees. This is where prospects compare
   prices, so it should show the same switch the settings page does.

   Prices and caps come from PLANS rather than being typed in, so the marketing
   page cannot quietly drift from what checkout actually charges. */

const FEATURES: Record<PlanId, string[]> = {
  free: [
    "Unlimited bookmarks",
    "Previews, tags & instant search",
    "15 site scans a month",
    "1 design guide, to see what it does",
  ],
  lite: [
    "Everything in Free",
    `${PLANS.lite.limits.guide} design guides a month`,
    "Unlimited site scans",
    "Mix up to 8 sources",
  ],
  pro: [
    "Everything in Lite",
    `${PLANS.pro.limits.guide} design guides a month`,
    "Unlimited site scans",
    "Priority generation",
  ],
  studio: [],
};

const BLURB: Record<PlanId, string> = {
  free: "The library, always yours.",
  lite: "For the occasional build.",
  pro: "For shipping weekly.",
  studio: "",
};

interface PricingPlansProps {
  loggedIn: boolean;
  /** Where a plan CTA should land — settings when signed in, signup otherwise. */
  planHref: string;
}

export function PricingPlans({ loggedIn, planHref }: PricingPlansProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const shown: PlanId[] = ["free", "lite", "pro"];

  return (
    <>
      <div className="lp-toggle-wrap">
        <div className="lp-toggle">
          {(["monthly", "quarterly"] as BillingInterval[]).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={interval === i ? "is-on" : undefined}
              aria-pressed={interval === i}
            >
              {i === "monthly" ? "Monthly" : "Quarterly"}
              {i === "quarterly" && <em>save 10%</em>}
            </button>
          ))}
        </div>
      </div>

      <div className="lp-plans">
        {shown.map((id) => {
          const plan = PLANS[id];
          const price = plan.prices[interval];
          const cta =
            id === "free" ? "Open app" : id === "lite" ? "Choose Lite" : "Go Pro";

          return (
            <div
              key={id}
              className={id === "pro" ? "lp-plan lp-plan-pro" : "lp-plan"}
            >
              {id === "pro" && <span className="lp-plan-flag">Most popular</span>}
              <h3>{plan.name}</h3>

              <div className="lp-price">
                ${price ? price.perMonth.toFixed(2) : "0"}{" "}
                <span>{price ? "/ month" : "forever"}</span>
              </div>

              {/* Quarterly bills as one payment — showing only the per-month
                  figure would misstate what actually gets charged. Fixed height
                  so the three cards keep their headings aligned. */}
              <p className="lp-price-note">
                {price && interval === "quarterly"
                  ? `$${price.amount.toFixed(2)} billed every 3 months`
                  : " "}
              </p>

              <p className="lp-plan-blurb">{BLURB[id]}</p>
              <ul>
                {FEATURES[id].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <Link
                href={planHref}
                className={
                  id === "pro"
                    ? "lp-btn lp-btn-primary lp-btn-block"
                    : "lp-btn lp-btn-ghost lp-btn-block"
                }
              >
                {loggedIn ? cta : "Start free"}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
