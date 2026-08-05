// Resolves Stripe price ids from lookup keys.
//
// The old design put the price id in an env var (STRIPE_PRICE_ID_PRO). With 3
// tiers x 2 intervals that would be six env vars to create, keep in sync, and
// re-swap at the live cutover. Lookup keys live on the price object in Stripe
// instead, are identical across test and live mode, and are already what
// `scripts/setup-stripe.mjs` sets — so the live swap becomes a single secret
// key change rather than six.
//
// Resolution is memoised per cold start: one Stripe call, then free.

import { stripe } from "./client";

let cache: Map<string, string> | null = null;
let inflight: Promise<Map<string, string>> | null = null;

async function loadPrices(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // `lookup_keys` accepts up to 10 per call, which covers every plan we sell.
  // Paginating would be premature; assert instead so a 7th price is a loud
  // failure rather than a silently missing tier.
  const { ALL_LOOKUP_KEYS } = await import("@/lib/billing/plans");
  if (ALL_LOOKUP_KEYS.length > 10) {
    throw new Error(
      `Too many lookup keys (${ALL_LOOKUP_KEYS.length}) for a single Stripe query — add pagination.`
    );
  }
  const res = await stripe.prices.list({
    lookup_keys: ALL_LOOKUP_KEYS,
    active: true,
    limit: 100,
  });
  for (const price of res.data) {
    if (price.lookup_key) map.set(price.lookup_key, price.id);
  }
  return map;
}

/** Price id for a lookup key, or null if Stripe doesn't have it yet. */
export async function priceIdForLookupKey(key: string): Promise<string | null> {
  if (!cache) {
    // Share one in-flight request between concurrent callers on a cold start.
    inflight ??= loadPrices();
    cache = await inflight;
    inflight = null;
  }
  return cache.get(key) ?? null;
}

/**
 * Which plan a Stripe price belongs to.
 *
 * Lookup key first, then the product's `snapp_plan` metadata. The fallback is
 * not belt-and-braces — it's load-bearing. Stripe prices are immutable, so
 * changing an amount means creating a new price and moving the lookup key onto
 * it, which strips the key from the OLD price. Subscribers still billing on
 * that old price would then resolve to no plan at all, and the webhook would
 * downgrade them to Free on their next renewal while they're still paying.
 * Product metadata survives the swap because both prices hang off the same
 * product.
 */
export async function planIdForPrice(priceId: string): Promise<string | null> {
  const { planForLookupKey } = await import("@/lib/billing/plans");
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });

    if (price.lookup_key) {
      const byKey = planForLookupKey(price.lookup_key);
      if (byKey) return byKey;
    }

    const product = price.product;
    if (product && typeof product !== "string" && !("deleted" in product)) {
      const fromMetadata = product.metadata?.snapp_plan;
      if (fromMetadata) {
        console.warn(
          `Price ${priceId} has no usable lookup key; resolved plan "${fromMetadata}" from product metadata (legacy price?)`
        );
        return fromMetadata;
      }
    }
    return null;
  } catch (e) {
    console.error("planIdForPrice failed:", e);
    return null;
  }
}

/** Drop the memoised map — used by tests and after creating prices. */
export function clearPriceCache(): void {
  cache = null;
  inflight = null;
}
