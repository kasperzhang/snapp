"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, LogOut, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type Billing = {
  plan: "free" | "pro";
  usage: Record<"guide" | "analysis" | "scan", { used: number; limit: number }>;
};

const METERS: { key: keyof Billing["usage"]; label: string }[] = [
  { key: "guide", label: "Design briefs" },
  { key: "analysis", label: "Site analyses" },
  { key: "scan", label: "Deep scans" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);

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

  const goBilling = async (endpoint: "checkout" | "portal") => {
    try {
      setBillingBusy(true);
      const res = await fetch(`/api/billing/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setBillingBusy(false);
    } catch {
      setBillingBusy(false);
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

          {/* Profile */}
          <section className="mt-8 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Profile
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-lg font-semibold text-[var(--background)]">
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

          {/* Plan & usage */}
          <section className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Plan &amp; usage
              </p>
              {billing && (
                <span
                  className={cn(
                    "rounded px-2 py-0.5 font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-wide",
                    billing.plan === "pro"
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--border)] text-[var(--text-secondary)]"
                  )}
                >
                  {billing.plan}
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
                <div className="pt-1">
                  {billing.plan === "pro" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => goBilling("portal")}
                      loading={billingBusy}
                    >
                      <CreditCard className="h-4 w-4" />
                      Manage billing
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => goBilling("checkout")}
                      loading={billingBusy}
                    >
                      <Zap className="h-4 w-4" />
                      Upgrade to Pro — $12/mo
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-[var(--text-muted)]">
                Loading usage…
              </p>
            )}
          </section>

          {/* Account */}
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
        </main>
      </ContentPanel>
    </div>
  );
}
