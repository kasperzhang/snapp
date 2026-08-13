"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  PLANS,
  type BillingInterval,
  type PlanId,
  type UsageKind,
} from "@/lib/billing/plans";
import { PlanCards } from "@/components/billing/PlanCards";
import { ExtensionRow } from "@/components/settings/ExtensionRow";

type Billing = {
  plan: PlanId;
  usage: Record<UsageKind, { used: number; limit: number }>;
  /** Set to lapse at the end of the paid period — access continues until then. */
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

type TabId = "profile" | "plan" | "account";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "plan", label: "Plan" },
  { id: "account", label: "Account" },
];

// Single-site guides and Mixes share one pool, so there are two meters, not
// three. Scans are effectively unlimited on paid plans — the cap exists to
// bound a scripted account, not to ration the feature — so it reads that way.
const METERS: { key: UsageKind; label: string }[] = [
  { key: "guide", label: "Design guides" },
  { key: "scan", label: "Site scans" },
];

function SettingsInner() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [billing, setBilling] = useState<Billing | null>(null);
  // Which button is mid-redirect — several can be on screen at once now.
  const [billingBusy, setBillingBusy] = useState<PlanId | "portal" | null>(null);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  // Tab lives in the URL so the over-limit prompts can land straight on the
  // plans instead of dropping people on the profile form to hunt for it.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabId = TABS.some((t) => t.id === tabParam)
    ? (tabParam as TabId)
    : "profile";
  const setTab = (next: TabId) =>
    router.replace(next === "profile" ? "/settings" : `/settings?tab=${next}`, {
      scroll: false,
    });

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!alive || !user) return;
      setUserEmail(user.email ?? undefined);
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (!alive) return;
      setFullName(profile?.full_name ?? "");
      setNameLoaded(true);
    })();
    fetch("/api/billing/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setBilling(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveName = async () => {
    if (!userId || !nameLoaded) return;
    const name = fullName.trim();
    await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  // Checks out at whichever interval the PlanCards toggle is showing — the
  // price on screen and the price charged have to be the same one.
  const goCheckout = async (plan: PlanId) => {
    try {
      setBillingBusy(plan);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval: billingInterval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setBillingBusy(null);
    } catch {
      setBillingBusy(null);
    }
  };

  const goPortal = async () => {
    try {
      setBillingBusy("portal");
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setBillingBusy(null);
    } catch {
      setBillingBusy(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sidebar)]">
      <Sidebar userEmail={userEmail} />
      <ContentPanel>
        <main className="mx-auto w-full max-w-[640px] px-6 py-8 md:py-10">
          <Link
            href="/app"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookmarks
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Settings
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Your profile, plan, and account.
          </p>

          {/* Tabs. Three short sections would not justify this on their own —
              the Plan tab is what needs the room, now that it carries a full
              comparison rather than two unlabelled buy buttons. */}
          <div className="mt-7 flex gap-1 border-b border-[var(--border)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                  tab === t.id
                    ? "border-[var(--brand)] font-medium text-[var(--foreground)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "profile" && (
            <>
          <section className="mt-8 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Profile
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-semibold text-[var(--background)]">
                {(fullName.trim() || userEmail || "?")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Name
                </label>
                <div className="relative mt-1.5">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.target as HTMLInputElement).blur()
                    }
                    placeholder={nameLoaded ? "Your name" : "Loading…"}
                    disabled={!nameLoaded}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                  />
                  {nameSaved && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--accent)]">
                      Saved
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Email
              </label>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                {userEmail ?? "—"}
              </p>
            </div>
          </section>

          <ExtensionRow />
            </>
          )}

          {tab === "plan" && (
            <>
              <section className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Your plan
                  </p>
                  {billing && (
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-wide",
                        billing.plan === "free"
                          ? "bg-[var(--border)] text-[var(--text-secondary)]"
                          : "bg-[var(--brand)] text-white"
                      )}
                    >
                      {PLANS[billing.plan]?.name ?? billing.plan}
                    </span>
                  )}
                </div>

                {billing ? (
                  <div className="mt-5 space-y-4">
                    {METERS.map((m) => {
                      const { used, limit } = billing.usage[m.key];
                      const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
                      return (
                        <div key={m.key}>
                          <div className="flex items-baseline justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">
                              {m.label}
                            </span>
                            <span className="font-mono text-[12px] tabular-nums text-[var(--foreground)]">
                              {used} / {limit}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--border-light)]">
                            <div
                              className="h-full rounded-full bg-[var(--brand)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="pt-1 text-xs text-[var(--text-muted)]">
                      Counts reset monthly. Saving bookmarks is always free and
                      unlimited.
                    </p>

                    {billing.cancelAtPeriodEnd && (
                      <div className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--sidebar)] px-3.5 py-3">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                          Your {PLANS[billing.plan]?.name ?? billing.plan} plan is
                          set to end
                          {formatDate(billing.currentPeriodEnd)
                            ? ` on ${formatDate(billing.currentPeriodEnd)}`
                            : " at the end of this billing period"}
                          . You keep everything until then — reactivate any time
                          from Manage billing.
                        </p>
                      </div>
                    )}

                    {billing.plan !== "free" && (
                      <div className="pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={goPortal}
                          loading={billingBusy === "portal"}
                          disabled={billingBusy !== null}
                        >
                          <CreditCard className="h-4 w-4" />
                          Manage billing
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[var(--text-muted)]">
                    Loading usage…
                  </p>
                )}
              </section>

              {billing && (
                <section className="mt-5">
                  <PlanCards
                    currentPlan={billing.plan}
                    interval={billingInterval}
                    onIntervalChange={setBillingInterval}
                    hasSubscription={billing.plan !== "free"}
                    onChoose={goCheckout}
                    onManage={goPortal}
                    busy={billingBusy}
                  />
                </section>
              )}
            </>
          )}

          {tab === "account" && (
          <section className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Account
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Sign out of snapp on this device.
              </p>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </section>
          )}
        </main>
      </ContentPanel>
    </div>
  );
}

// useSearchParams needs a Suspense boundary in the app router.
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}
