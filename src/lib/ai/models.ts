// The model registry and the routing table that picks one.
//
// Both generation routes used to hardcode `const MODEL = "claude-sonnet-5"`.
// Three things are coming that all need to vary the model per request — a
// cheaper model on the free tier, a per-feature split, and BYOK — so the choice
// lives here instead of at the call sites.
//
// TODAY THIS IS A NO-OP: every route/plan resolves to claude-sonnet-5, exactly
// what shipped before. `ROUTING` is the single place to change once the eval in
// `scripts/eval-guides.mjs` says which model wins.

import type { PlanId } from "@/lib/billing/plans";

export type Provider = "anthropic" | "google";

/** The two things that generate text. Costs and difficulty differ sharply. */
export type AiFeature =
  /** One scanned site -> a design-system spec. Mechanical; one screenshot. */
  | "guide"
  /** Up to 8 sites -> one synthesised guide. Reasoning-heavy; many screenshots. */
  | "mix";

export interface ModelSpec {
  id: string;
  provider: Provider;
  /** USD per 1M tokens. Cached input is the discounted prefix-hit rate. */
  inputPerM: number;
  outputPerM: number;
  cachedInputPerM: number;
  /** Both features send screenshots — a model without this can't be routed to. */
  vision: boolean;
}

export const MODELS: Record<string, ModelSpec> = {
  "claude-sonnet-5": {
    id: "claude-sonnet-5",
    provider: "anthropic",
    // Standard rates. Introductory pricing ($2/$10) ends 2026-08-31; these are
    // the numbers to bill against so margins don't silently invert in September.
    inputPerM: 3.0,
    outputPerM: 15.0,
    cachedInputPerM: 0.3,
    vision: true,
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    inputPerM: 1.0,
    outputPerM: 5.0,
    cachedInputPerM: 0.1,
    vision: true,
  },
  // NB: these ids must match Google's ListModels output exactly — the "-preview"
  // suffix is part of the name, and getting it wrong is a 404, not a fallback.
  // Verify with: GET generativelanguage.googleapis.com/v1beta/models?key=…
  "gemini-3-flash-preview": {
    id: "gemini-3-flash-preview",
    provider: "google",
    inputPerM: 0.5,
    outputPerM: 3.0,
    // Gemini's implicit cache is automatic and free; there's no explicit
    // cache_control equivalent to port, and explicit context caching bills
    // hourly storage that would dominate a 4K prompt.
    cachedInputPerM: 0.5,
    vision: true,
  },
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    provider: "google",
    inputPerM: 0.25,
    outputPerM: 1.5,
    cachedInputPerM: 0.25,
    vision: true,
  },
};

export const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * Which model serves a given feature on a given plan.
 *
 * Deliberately uniform right now. The intended shape once the eval lands is
 * cheap-model-for-free-tier, and possibly cheap-model-for-`guide` across the
 * board, keeping the expensive model for `mix` where the synthesis quality is
 * the product.
 */
const ROUTING: Record<AiFeature, Partial<Record<PlanId, string>>> = {
  guide: {},
  mix: {},
};

export function resolveModel(feature: AiFeature, plan: PlanId): ModelSpec {
  const id = ROUTING[feature]?.[plan] ?? DEFAULT_MODEL;
  const spec = MODELS[id];
  if (!spec) throw new Error(`Unknown model in routing table: ${id}`);
  return spec;
}

/** Pricing lookup for usage metering. Unknown models meter as $0 rather than throw. */
export const MODEL_PRICING: Record<
  string,
  { inputPerM: number; outputPerM: number; cachedInputPerM: number }
> = Object.fromEntries(
  Object.values(MODELS).map((m) => [
    m.id,
    {
      inputPerM: m.inputPerM,
      outputPerM: m.outputPerM,
      cachedInputPerM: m.cachedInputPerM,
    },
  ])
);
