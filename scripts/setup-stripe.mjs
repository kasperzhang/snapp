// One-off: create (or reuse) the "snapp Pro" monthly product/price in Stripe,
// then print the price id to put in STRIPE_PRICE_ID_PRO.
//
// Run:  node --env-file=.env.local scripts/setup-stripe.mjs
// Uses whichever key is in STRIPE_SECRET_KEY (sk_test_… = test mode).

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY not found. Run with: node --env-file=.env.local scripts/setup-stripe.mjs");
  process.exit(1);
}

const stripe = new Stripe(key);
const LOOKUP_KEY = "snapp_pro_monthly";
const PRICE_CENTS = 1200; // $12.00 / month — change here or in the dashboard

const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";

// Idempotent: reuse an existing price with our lookup key if present.
const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], limit: 1 });
let price = existing.data[0];

if (price) {
  console.log(`↻ Reusing existing price (${mode} mode).`);
} else {
  const product = await stripe.products.create({
    name: "snapp Pro",
    description: "Higher monthly limits for design guides, analyses, and scans.",
  });
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: LOOKUP_KEY,
  });
  console.log(`✓ Created "snapp Pro" product + price (${mode} mode).`);
}

console.log("\nAdd this line to .env.local:\n");
console.log(`STRIPE_PRICE_ID_PRO=${price.id}\n`);
