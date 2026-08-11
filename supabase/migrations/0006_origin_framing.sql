-- Migration 0006 — remember which sites permit being framed
--
-- Grid cards show a live <iframe> when the site allows framing and fall back to
-- the scan screenshot when it doesn't. That verdict lives in the site's response
-- headers, so it can only be read server-side — and it used to be cached in
-- serverless module memory, which meant every cold instance re-probed every
-- origin from scratch. Cards sat on their screenshot for as long as the slowest
-- probe took, on every load, which is what made the grid feel static.
--
-- The verdict is a property of the site, not of the user, so one row per origin
-- is shared by everyone. Read by any signed-in user; written only by the service
-- role.
--
-- Safe/idempotent. Apply in the Supabase SQL editor or via `supabase db push`.

CREATE TABLE IF NOT EXISTS origin_framing (
  origin TEXT PRIMARY KEY,
  embeddable BOOLEAN NOT NULL,
  -- Why, so a transient failure can be retried sooner than a real refusal:
  -- 'ok' | 'x-frame-options' | 'frame-ancestors' | 'unreachable'
  reason TEXT NOT NULL DEFAULT 'ok',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE origin_framing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read framing verdicts" ON origin_framing;
CREATE POLICY "Signed-in users can read framing verdicts"
  ON origin_framing FOR SELECT TO authenticated USING (TRUE);

COMMENT ON TABLE origin_framing IS
  'Cache of per-origin X-Frame-Options / CSP frame-ancestors verdicts. Not user data — one row per origin, shared. Writes go through the service role only.';
