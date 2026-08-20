"use client";

import { useEffect, useState } from "react";
import { PlanId, UsageKind } from "@/lib/billing/plans";
import { onUsageChanged } from "@/lib/billing/usage-events";

export interface Billing {
  plan: PlanId;
  usage: Record<UsageKind, { used: number; limit: number }>;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
}

/* This month's plan and usage. Lifted out of the sidebar because the counter
   matters most next to the buttons that spend it, not only in the account menu
   you have to open to find it.

   Shared across every caller rather than fetched per component: a mix page now
   asks in three places at once, and they must agree anyway. One request, one
   answer, and a usage event refreshes all of them together. */
let cache: Billing | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load(force = false): void {
  if (!force && (cache || inflight)) return;
  if (inflight) {
    // A counter moved while a read was already out — take the later answer.
    inflight.then(() => load(true));
    return;
  }
  inflight = fetch("/api/billing/usage")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d) {
        cache = d;
        listeners.forEach((l) => l());
      }
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
}

export function useBilling(): Billing | null {
  const [, bump] = useState(0);

  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    listeners.add(onChange);
    load();
    const off = onUsageChanged(() => load(true));
    return () => {
      listeners.delete(onChange);
      off();
    };
  }, []);

  return cache;
}

/** Guides left this month, or null until the numbers arrive. */
export function guidesLeft(billing: Billing | null): number | null {
  if (!billing) return null;
  const { used, limit } = billing.usage.guide;
  return Math.max(0, limit - used);
}
