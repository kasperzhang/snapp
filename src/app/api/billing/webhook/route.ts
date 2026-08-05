import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { planIdForPrice } from "@/lib/stripe/prices";
import { PLANS, type PlanId } from "@/lib/billing/plans";

// Stripe webhook. Verifies the signature, then keeps the `subscriptions` table
// in sync with Stripe. Writes with the service-role client (bypasses RLS) since
// there's no user session here. Configure the endpoint at /api/billing/webhook
// and put its signing secret in STRIPE_WEBHOOK_SECRET.

export const runtime = "nodejs";

/**
 * Whether this subscription is set to lapse rather than renew.
 *
 * Checks BOTH signals on purpose. On older API versions cancelling at period
 * end flipped `cancel_at_period_end` to true; on 2026-06-24.dahlia (what this
 * account is on) that boolean stays false and Stripe sets a `cancel_at`
 * timestamp instead. Reading only the boolean silently missed every
 * cancellation — the portal said "Cancels Sep 3" while the app showed nothing.
 */
function isCancelling(sub: Stripe.Subscription): boolean {
  if (sub.cancel_at_period_end) return true;
  const s = sub as unknown as { cancel_at?: number | null };
  return typeof s.cancel_at === "number" && s.cancel_at * 1000 > Date.now();
}

function periodEndISO(sub: Stripe.Subscription): string | null {
  // `current_period_end` location has shifted across API versions; check both.
  const s = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Resolve the app user: prefer subscription metadata, else match by customer.
  let userId = sub.metadata?.supabase_user_id;
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? undefined;
  }
  if (!userId) {
    console.error("Webhook: no user for customer", customerId);
    return;
  }

  const active = sub.status === "active" || sub.status === "trialing";

  // Which tier they're on comes from the subscribed price, not from a hardcoded
  // "pro" — there are three sellable tiers now, and a portal upgrade/downgrade
  // arrives here as a subscription.updated with a different price.
  let plan: PlanId = "free";
  if (active) {
    const priceId = sub.items?.data?.[0]?.price?.id;
    const resolved = priceId ? await planIdForPrice(priceId) : null;

    if (resolved && resolved in PLANS) {
      plan = resolved as PlanId;
    } else {
      // An active subscription we can't map is the dangerous case: writing
      // "free" here downgrades someone who is still being charged. Keep
      // whatever plan they already have and shout, rather than silently
      // demoting them on a renewal event.
      const { data: existing } = await admin
        .from("subscriptions")
        .select("plan")
        .eq("user_id", userId)
        .maybeSingle();
      plan = (existing?.plan as PlanId) ?? "free";
      console.error(
        `Webhook: active subscription ${sub.id} has unmappable price ${priceId ?? "?"} — ` +
          `keeping existing plan "${plan}". Add a lookup key or set snapp_plan metadata on its product.`
      );
    }
  }

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: periodEndISO(sub),
      // A cancelled-but-not-yet-expired subscription is still `active` with a
      // future period end, so without this flag the app cannot tell it apart
      // from a healthy one — and the user gets no acknowledgement that they
      // cancelled. Access continues until the period ends either way.
      cancel_at_period_end: isCancelling(sub),
    },
    { onConflict: "user_id" }
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
