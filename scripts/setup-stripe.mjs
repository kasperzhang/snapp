// Creates (or reconciles) every snapp product and price in Stripe.
//
// Run:  node --env-file=.env.local scripts/setup-stripe.mjs
//       node --env-file=.env.local scripts/setup-stripe.mjs --dry
//
// Uses whichever key is in STRIPE_SECRET_KEY (sk_test_… = test mode). Run it
// once per mode — the same lookup keys exist in both, which is what makes the
// live cutover a single env-var change instead of six.
//
// Idempotent: existing prices are reused. Stripe prices are IMMUTABLE, so if an
// amount changes here the script creates a new price, moves the lookup key onto
// it, and archives the old one. Existing subscribers keep billing at the price
// they signed up on — Stripe never re-prices a live subscription — so changing
// an amount here only affects new checkouts.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY not found. Run with: node --env-file=.env.local scripts/setup-stripe.mjs");
  process.exit(1);
}

const DRY = process.argv.includes("--dry");
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";

// Mirrors PLANS in src/lib/billing/plans.ts. Kept as plain data here so the
// script stays runnable without the TypeScript toolchain.
const PLANS = [
  {
    id: "lite",
    name: "snapp Lite",
    description: "10 design guides a month, unlimited scans and bookmarks.",
    prices: [
      { lookupKey: "snapp_lite_monthly", cents: 399, interval: "month", count: 1 },
      { lookupKey: "snapp_lite_quarterly", cents: 1079, interval: "month", count: 3 },
    ],
  },
  {
    id: "pro",
    name: "snapp Pro",
    description: "40 design guides a month, unlimited scans and bookmarks.",
    prices: [
      { lookupKey: "snapp_pro_monthly", cents: 999, interval: "month", count: 1 },
      { lookupKey: "snapp_pro_quarterly", cents: 2699, interval: "month", count: 3 },
    ],
  },
  // Studio is created but ARCHIVED (`sellable: false`) until BYOK ships.
  //
  // `purchasable: false` in plans.ts blocks our own checkout route, but it
  // cannot stop Stripe: the billing portal's plan-switcher offers every active
  // product, and the `subscription_update.products` restriction is not
  // supported on API version 2026-06-24.dahlia. An archived price can't be
  // subscribed to or switched to by anyone, which is the only reliable gate.
  // Flip `sellable` to true and re-run when BYOK is live.
  {
    id: "studio",
    name: "snapp Studio",
    description: "Bring your own Anthropic key. Unlimited generations.",
    sellable: false,
    prices: [
      { lookupKey: "snapp_studio_monthly", cents: 1699, interval: "month", count: 1 },
      { lookupKey: "snapp_studio_quarterly", cents: 4599, interval: "month", count: 3 },
    ],
  },
];

console.log(`\nStripe setup — ${mode} mode${DRY ? " (dry run, nothing will be written)" : ""}\n`);

let created = 0;
let reused = 0;
let replaced = 0;

for (const plan of PLANS) {
  // Find the product by lookup key of any of its prices, else by name — Stripe
  // has no natural key for products, and matching on name alone would create a
  // duplicate every time someone edits the name.
  let product = null;
  for (const p of plan.prices) {
    const found = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 });
    if (found.data[0]) {
      product =
        typeof found.data[0].product === "string"
          ? await stripe.products.retrieve(found.data[0].product)
          : found.data[0].product;
      break;
    }
  }

  if (!product) {
    if (DRY) {
      console.log(`  would create product  ${plan.name}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { snapp_plan: plan.id },
      });
      console.log(`  created product  ${plan.name}  (${product.id})`);
    }
  } else if (product.metadata?.snapp_plan !== plan.id) {
    // Tag reused products too. This metadata is the ONLY thing that maps a
    // legacy price back to a plan after its lookup key has been moved onto a
    // replacement — without it, existing subscribers on an old price become
    // unmappable and the webhook can't tell what they're paying for.
    if (DRY) {
      console.log(`  would tag product     ${plan.name}  snapp_plan=${plan.id}`);
    } else {
      product = await stripe.products.update(product.id, {
        metadata: { ...product.metadata, snapp_plan: plan.id },
      });
      console.log(`  tagged product   ${plan.name}  snapp_plan=${plan.id}`);
    }
  }

  const wantActive = plan.sellable !== false;

  for (const p of plan.prices) {
    const existing = (await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 })).data[0];

    if (existing && existing.unit_amount === p.cents) {
      if (existing.active !== wantActive) {
        console.log(
          `  ${wantActive ? "↑" : "↓"} ${p.lookupKey.padEnd(26)} $${(p.cents / 100).toFixed(2)}  (${wantActive ? "re-activating" : "archiving — plan not sellable yet"})`
        );
        if (!DRY) await stripe.prices.update(existing.id, { active: wantActive });
      } else {
        console.log(
          `  ✓ ${p.lookupKey.padEnd(26)} $${(p.cents / 100).toFixed(2)} / ${p.count}mo  (unchanged${wantActive ? "" : ", archived"})`
        );
      }
      reused += 1;
      continue;
    }

    if (existing) {
      console.log(
        `  ! ${p.lookupKey.padEnd(26)} $${(existing.unit_amount / 100).toFixed(2)} -> $${(p.cents / 100).toFixed(2)}  (price is immutable; creating a replacement)`
      );
      if (!DRY) {
        // Free the lookup key before reusing it, then archive the old price so
        // it can't be checked out again. Live subscriptions on it are untouched.
        await stripe.prices.update(existing.id, { lookup_key: null, active: false });
      }
      replaced += 1;
    } else {
      console.log(`  + ${p.lookupKey.padEnd(26)} $${(p.cents / 100).toFixed(2)} / ${p.count}mo  (new)`);
      created += 1;
    }

    if (!DRY) {
      const created = await stripe.prices.create({
        product: product.id,
        unit_amount: p.cents,
        currency: "usd",
        recurring: { interval: p.interval, interval_count: p.count },
        lookup_key: p.lookupKey,
        transfer_lookup_key: true,
      });
      // Prices are created active; archive immediately if the plan isn't for
      // sale yet, so it never appears in the portal's plan switcher.
      if (!wantActive) await stripe.prices.update(created.id, { active: false });
    }
  }
  console.log("");
}

console.log(
  DRY
    ? "Dry run complete — re-run without --dry to apply.\n"
    : `Done. ${created} created, ${replaced} replaced, ${reused} unchanged.\n` +
        "No env vars to set: the app resolves prices by lookup key (src/lib/stripe/prices.ts).\n"
);
