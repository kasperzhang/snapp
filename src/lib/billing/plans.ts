// Plan definitions and pricing constants for snapp's B2C plans.
//
// Phase 0 uses these only for monthly usage caps (everyone is on `free` until
// Stripe lands in Phase 1). The limits map is the single source of truth for
// "how much can this plan do per month".

export type PlanId = "free" | "pro";

export type UsageKind = "guide" | "analysis" | "scan";

export interface PlanLimits {
  /** Combined multi-source design guides / month (most expensive). */
  guide: number;
  /** Single-site AI design analyses / month. */
  analysis: number;
  /** Website scans (headless Chromium) / month. */
  scan: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  limits: PlanLimits;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    limits: { guide: 5, analysis: 15, scan: 30 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    limits: { guide: 200, analysis: 1000, scan: 2000 },
  },
};

// Max reference sites (screenshots) sent to Claude in a single combined-guide
// generation. Caps the per-call cost/latency blast radius.
export const MAX_GUIDE_SOURCES = 8;

// Anthropic pricing in USD per 1M tokens. Keep in sync with the model in use.
// (claude-sonnet-5 standard rates; introductory rates are lower.)
export const MODEL_PRICING: Record<
  string,
  { inputPerM: number; outputPerM: number; cachedInputPerM: number }
> = {
  "claude-sonnet-5": { inputPerM: 3.0, outputPerM: 15.0, cachedInputPerM: 0.3 },
};
