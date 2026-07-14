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

  const kinds: UsageKind[] = ["guide", "analysis", "scan"];
  const results = await Promise.all(
    kinds.map((k) => checkUsageLimit(supabase, user.id, k))
  );

  const usage = Object.fromEntries(
    kinds.map((k, i) => [k, { used: results[i].used, limit: results[i].limit }])
  );

  return NextResponse.json({ plan: results[0].plan, usage });
}
