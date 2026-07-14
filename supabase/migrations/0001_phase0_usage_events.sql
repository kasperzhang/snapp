-- Migration 0001 — Phase 0 guardrails: usage metering
-- Apply to an existing snapp database (schema.sql already includes this for
-- fresh installs). Safe to run once. Run in the Supabase SQL editor or via
-- `supabase db push` / psql.

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('guide', 'analysis', 'scan')),
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_cents NUMERIC(12, 4) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_kind_created
  ON usage_events(user_id, kind, created_at);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own usage" ON usage_events;
CREATE POLICY "Users can view their own usage"
  ON usage_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can record their own usage" ON usage_events;
CREATE POLICY "Users can record their own usage"
  ON usage_events FOR INSERT WITH CHECK (auth.uid() = user_id);
