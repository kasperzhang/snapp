// Usage metering + monthly plan-limit enforcement.
//
// - `checkUsageLimit` counts this calendar month's `usage_events` for a user and
//   compares against their plan cap. Call it BEFORE doing expensive work.
// - `recordUsage` writes one ledger row AFTER the work succeeds (best-effort;
//   never throws, so metering can't break the user-facing action).
// - `estimateCostCents` turns an Anthropic `usage` object into an estimated cost.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, PlanId, UsageKind } from "./plans";
import { MODEL_PRICING } from "@/lib/ai/models";

/**
 * Which plan a user is on, from the `subscriptions` table. A user counts as Pro
 * only while their Stripe subscription is active/trialing; otherwise (no row,
 * canceled, past_due, etc.) they fall back to Free.
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanId> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return "free";

  const active = data.status === "active" || data.status === "trialing";
  if (!active) return "free";

  // Trust the webhook's plan id, but never a value we don't have limits for —
  // an unknown plan should degrade to Free, not crash the usage check.
  const plan = data.plan as PlanId;
  return plan in PLANS ? plan : "free";
}

function monthStartISO(): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  ).toISOString();
}

export interface LimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: PlanId;
}

export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  kind: UsageKind
): Promise<LimitResult> {
  const plan = await getUserPlan(supabase, userId);
  const limit = PLANS[plan].limits[kind];

  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", monthStartISO());

  if (error) {
    // Fail OPEN on metering read errors: don't block a paying/free user because
    // the counter query hiccuped. The error is logged for observability.
    console.error("checkUsageLimit read failed:", error);
    return { allowed: true, used: 0, limit, plan };
  }

  const used = count ?? 0;
  return { allowed: used < limit, used, limit, plan };
}

interface AnthropicUsageLike {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/**
 * Total input tokens billed, including cache write/read. With prompt caching on,
 * `input_tokens` only counts the uncached remainder, so summing all three gives
 * the real input volume for metering/analytics.
 */
export function totalInputTokens(usage?: AnthropicUsageLike | null): number {
  if (!usage) return 0;
  return (
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0)
  );
}

export function estimateCostCents(
  model: string,
  usage?: AnthropicUsageLike | null
): number {
  const p = MODEL_PRICING[model];
  if (!p || !usage) return 0;
  const inTok = usage.input_tokens ?? 0;
  const outTok = usage.output_tokens ?? 0;
  const cachedRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const dollars =
    (inTok / 1e6) * p.inputPerM +
    (cacheWrite / 1e6) * p.inputPerM * 1.25 + // cache writes bill at ~1.25x
    (cachedRead / 1e6) * p.cachedInputPerM +
    (outTok / 1e6) * p.outputPerM;
  // cents, rounded to 4 decimal places
  return Math.round(dollars * 100 * 10000) / 10000;
}

export async function recordUsage(
  supabase: SupabaseClient,
  args: {
    userId: string;
    kind: UsageKind;
    tokensIn?: number;
    tokensOut?: number;
    costCents?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("usage_events").insert({
      user_id: args.userId,
      kind: args.kind,
      tokens_in: args.tokensIn ?? 0,
      tokens_out: args.tokensOut ?? 0,
      cost_cents: args.costCents ?? 0,
      metadata: args.metadata ?? {},
    });
    if (error) console.error("recordUsage insert failed:", error);
  } catch (e) {
    console.error("recordUsage threw:", e);
  }
}
