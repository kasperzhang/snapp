-- Migration 0005 — surface a pending cancellation
--
-- Stripe's "cancel at period end" leaves the subscription `status = 'active'`
-- with a future `current_period_end` — byte-for-byte indistinguishable from a
-- healthy subscription in the columns we store. So a user who cancelled saw no
-- acknowledgement anywhere in the app, and we had no way to say "your plan ends
-- on the 3rd" or to win them back before it lapsed.
--
-- Written by the Stripe webhook from `subscription.cancel_at_period_end`.
--
-- Safe/idempotent. Apply in the Supabase SQL editor or via `supabase db push`.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN subscriptions.cancel_at_period_end IS
  'True when the subscription is set to lapse at current_period_end. Access continues until then — do NOT treat this as downgraded.';
