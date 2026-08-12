import Stripe from "stripe";

/* Server-side Stripe client. Uses the SDK's pinned API version (no override, to
   avoid version-string type drift). Never import this into a client component —
   STRIPE_SECRET_KEY must stay server-only.

   Constructed lazily, on first use, and that is load-bearing rather than tidy.
   `next build` imports every route module to collect page data, and the Stripe
   constructor throws on an empty key — so building with the key absent used to
   fail the entire build on a module nobody had called yet. That's how a preview
   deployment without billing configured died at
   "Failed to collect page data for /api/billing/checkout", and it's how a
   mistyped or unset key during the live-mode swap would take down the whole
   site rather than just billing.

   Deferring construction means a missing key surfaces as a 500 from the billing
   routes alone, which is what the previous version intended and didn't achieve:
   it warned instead of throwing, then handed `""` straight to the constructor. */

let client: Stripe | null = null;

function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — billing is unconfigured on this deployment."
    );
  }

  client = new Stripe(key, { typescript: true });
  return client;
}

/* A proxy so call sites keep reading `stripe.checkout.sessions.create(...)`
   while construction still waits for the first property access — which only
   happens inside a request handler. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
