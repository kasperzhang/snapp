-- Migration 0004 — four plan tiers + merged design-guide credits
--
-- Two changes, both of which MUST migrate existing rows, not just constraints:
--
-- 1. `usage_events.kind` loses 'analysis'. Single-site guides and Mixes now draw
--    on one shared "design guide" pool, so both meter as 'guide'. Existing
--    'analysis' rows are rewritten — without that, every user's historical count
--    silently drops to zero the moment the app stops counting 'analysis'.
--
-- 2. `subscriptions.plan` gains 'lite' and 'studio'. NOTE: 'pro' changes
--    MEANING — it used to be the only paid tier ($12/mo), it now refers to the
--    $9.99 middle tier. That is safe to do here only because Stripe is still in
--    sandbox and no live subscriber exists. The UPDATE below is a no-op on an
--    empty table and is written so it stays correct if any test rows survive.
--
-- Safe/idempotent. Apply in the Supabase SQL editor or via `supabase db push`.

-- ── 1. merged credits ───────────────────────────────────────────────────────
ALTER TABLE usage_events DROP CONSTRAINT IF EXISTS usage_events_kind_check;

UPDATE usage_events SET kind = 'guide' WHERE kind = 'analysis';

ALTER TABLE usage_events
  ADD CONSTRAINT usage_events_kind_check CHECK (kind IN ('guide', 'scan'));

-- ── 2. plan tiers ───────────────────────────────────────────────────────────
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- Any pre-existing paid row was on the old single "pro" tier, whose caps were
-- closest to the new Lite. Map it there rather than silently upgrading it.
UPDATE subscriptions
   SET plan = 'lite'
 WHERE plan = 'pro'
   AND created_at < '2026-08-03';

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'lite', 'pro', 'studio'));

COMMENT ON COLUMN subscriptions.plan IS
  'free | lite | pro | studio. Set by the Stripe webhook from the price lookup_key; see src/lib/billing/plans.ts.';
