import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/billing/limits";
import { UsageKind } from "@/lib/billing/plans";

// Returns the current user's plan and this month's usage vs. limits, for the
// account menu / usage meter.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kinds: UsageKind[] = ["guide", "scan"];
  const [results, { data: sub }] = await Promise.all([
    Promise.all(kinds.map((k) => checkUsageLimit(supabase, user.id, k))),
    supabase
      .from("subscriptions")
      .select("cancel_at_period_end, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const usage = Object.fromEntries(
    kinds.map((k, i) => [k, { used: results[i].used, limit: results[i].limit }])
  );

  return NextResponse.json({
    plan: results[0].plan,
    usage,
    // Only meaningful while still on a paid plan — once the period lapses the
    // webhook writes plan: "free" and there's nothing left to warn about.
    cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
    currentPeriodEnd: sub?.current_period_end ?? null,
  });
}
