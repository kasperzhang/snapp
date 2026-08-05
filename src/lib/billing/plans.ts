// Plan definitions, monthly caps, and the Stripe price lookup keys.
//
// Two things worth knowing before editing the numbers:
//
// 1. A "credit" is one design guide, whether it came from a single site or from
//    a Mix. They used to be metered separately (`guide` vs `analysis`), which
//    forced people to pick the cheaper action rather than the one they wanted.
//    On Sonnet 5 the cost spread is only 1.25x ($0.139 single-site to $0.174 for
//    an 8-source mix), so one shared pool can't be gamed meaningfully.
//
// 2. Scans are ~290x cheaper than credits ($0.0006 vs $0.174). The caps below
//    are set high enough that no real user reaches them — they exist to bound a
//    scripted account, not to ration the feature. Surface them as "unlimited".

export type PlanId = "free" | "lite" | "pro" | "studio";

/** What gets metered. `guide` covers both single-site guides and Mixes. */
export type UsageKind = "guide" | "scan";

export type BillingInterval = "monthly" | "quarterly";

export interface PlanLimits {
  /** Design guides per month — single-site or Mix, one shared pool. */
  guide: number;
  /** Website scans (headless Chromium) per month. */
  scan: number;
}

export interface PlanPrice {
  /** Stripe lookup_key. The source of truth for price ids — see scripts/setup-stripe.mjs. */
  lookupKey: string;
  /** Display price in USD for the whole interval. */
  amount: number;
  /** Effective per-month price, for the "$X/mo billed quarterly" line. */
  perMonth: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  limits: PlanLimits;
  /** Bring-your-own Anthropic key: generations bill to the user, not to us. */
  byok: boolean;
  /**
   * Whether checkout will sell this plan today. Studio is defined so the rest of
   * the system (webhook mapping, settings UI) can handle it, but it CANNOT be
   * sold until BYOK ships — its "unlimited" only makes sense when generations
   * bill to the customer's own key. Selling it before then would mean unlimited
   * generations at ~$0.174 each on our key.
   */
  purchasable: boolean;
  prices: Partial<Record<BillingInterval, PlanPrice>>;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    limits: { guide: 1, scan: 15 },
    byok: false,
    purchasable: false,
    prices: {},
  },
  lite: {
    id: "lite",
    name: "Lite",
    limits: { guide: 10, scan: 200 },
    byok: false,
    purchasable: true,
    prices: {
      monthly: { lookupKey: "snapp_lite_monthly", amount: 3.99, perMonth: 3.99 },
      quarterly: { lookupKey: "snapp_lite_quarterly", amount: 10.79, perMonth: 3.6 },
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    limits: { guide: 40, scan: 600 },
    byok: false,
    purchasable: true,
    prices: {
      monthly: { lookupKey: "snapp_pro_monthly", amount: 9.99, perMonth: 9.99 },
      quarterly: { lookupKey: "snapp_pro_quarterly", amount: 26.99, perMonth: 9.0 },
    },
  },
  studio: {
    id: "studio",
    name: "Studio",
    // Generous but finite even with BYOK: our own infra (Chromium, storage,
    // bandwidth) still runs regardless of whose API key pays for the tokens.
    limits: { guide: 500, scan: 3000 },
    byok: true,
    purchasable: false, // ← flip to true only once BYOK is live
    prices: {
      monthly: { lookupKey: "snapp_studio_monthly", amount: 16.99, perMonth: 16.99 },
      quarterly: { lookupKey: "snapp_studio_quarterly", amount: 45.99, perMonth: 15.33 },
    },
  },
};

/** Plans that checkout will actually sell right now, in ladder order. */
export const PURCHASABLE_PLANS: Plan[] = [PLANS.lite, PLANS.pro].filter(
  (p) => p.purchasable
);

/** Every lookup key we expect to exist in Stripe. */
export const ALL_LOOKUP_KEYS: string[] = Object.values(PLANS).flatMap((p) =>
  Object.values(p.prices).map((price) => price.lookupKey)
);

/** Reverse map, for turning a webhook's price back into a plan. */
export function planForLookupKey(key: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    for (const price of Object.values(plan.prices)) {
      if (price.lookupKey === key) return plan.id;
    }
  }
  return null;
}

export function priceFor(
  plan: PlanId,
  interval: BillingInterval
): PlanPrice | null {
  return PLANS[plan].prices[interval] ?? null;
}

// Max reference sites (screenshots) sent to the model in a single combined-guide
// generation. Caps the per-call cost/latency blast radius. Deliberately global
// rather than per-plan: a 4-source mix costs only 10% less than an 8-source one
// (output dominates and barely scales with source count), so tiering it would
// add a rule for no real saving.
export const MAX_GUIDE_SOURCES = 8;

// Per-model token pricing lives with the model registry, in
// `src/lib/ai/models.ts` — plans care about how much a user may do, not which
// model serves them.
