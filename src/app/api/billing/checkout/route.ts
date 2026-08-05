import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { priceIdForLookupKey } from "@/lib/stripe/prices";
import {
  PLANS,
  priceFor,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";

// Creates a Stripe Checkout session to subscribe the current user to Pro, then
// returns its URL for the client to redirect to.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate the requested tier server-side. A client could otherwise ask for
    // `studio` (not sellable until BYOK ships) or an interval we don't price.
    const body = await req.json().catch(() => ({}));
    const plan = body.plan as PlanId | undefined;
    const interval = (body.interval ?? "monthly") as BillingInterval;

    if (!plan || !(plan in PLANS) || !PLANS[plan].purchasable) {
      return NextResponse.json(
        { error: "That plan isn't available." },
        { status: 400 }
      );
    }

    const price = priceFor(plan, interval);
    if (!price) {
      return NextResponse.json(
        { error: `${PLANS[plan].name} has no ${interval} price.` },
        { status: 400 }
      );
    }

    const priceId = await priceIdForLookupKey(price.lookupKey);
    if (!priceId) {
      // The plan exists in code but not in Stripe — almost always means
      // scripts/setup-stripe.mjs hasn't been run against this mode.
      console.error(`No Stripe price for lookup key ${price.lookupKey}`);
      return NextResponse.json(
        { error: "Billing isn't fully configured yet." },
        { status: 500 }
      );
    }

    const admin = createAdminClient();

    // Reuse an existing Stripe customer if we have one; else create + persist it.
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "free",
          status: "inactive",
        },
        { onConflict: "user_id" }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${origin}/app?billing=success`,
      cancel_url: `${origin}/app?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 }
    );
  }
}
