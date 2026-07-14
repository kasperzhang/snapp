import Stripe from "stripe";

// Server-side Stripe client. Uses the SDK's pinned API version (no override, to
// avoid version-string type drift). Never import this into a client component —
// STRIPE_SECRET_KEY must stay server-only.
if (!process.env.STRIPE_SECRET_KEY) {
  // Don't throw at import time in dev where billing may be unconfigured; routes
  // that use it will surface a clear 500 instead.
  console.warn("STRIPE_SECRET_KEY is not set — billing routes will fail.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
});
