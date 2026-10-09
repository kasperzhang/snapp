-- Migration 0007 — reserve a credit before the work, not after
--
-- The plan cap used to be "count this month's usage_events, do the work, then
-- insert a row". A guide takes 60-120s, and every request fired inside that
-- window saw the same count — so a Free user with one guide a month could send
-- ten at once and get ten. This function counts and inserts under a per-user,
-- per-kind lock, so concurrent requests queue behind each other and only the
-- ones that fit under the cap get a row.
--
-- The app calls it with the service role only: it takes a user id as an
-- argument, so it must not be callable by the users themselves. Refunds (deleting
-- a reservation when the work failed) also go through the service role, which
-- is why usage_events still has no UPDATE or DELETE policy — a user who could
-- delete their own rows could reset their own cap.
--
-- Safe/idempotent. Apply in the Supabase SQL editor or via `supabase db push`.

CREATE OR REPLACE FUNCTION public.reserve_usage(
  p_user_id UUID,
  p_kind TEXT,
  p_limit INT,
  p_since TIMESTAMPTZ,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (reservation_id UUID, used INT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_used INT;
  v_id UUID;
BEGIN
  -- Held until the calling transaction (this RPC) commits.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_kind, 0));

  SELECT count(*) INTO v_used
    FROM usage_events
   WHERE user_id = p_user_id
     AND kind = p_kind
     AND created_at >= p_since;

  IF v_used >= p_limit THEN
    RETURN QUERY SELECT NULL::UUID, v_used;
    RETURN;
  END IF;

  INSERT INTO usage_events (user_id, kind, metadata)
  VALUES (p_user_id, p_kind, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_used;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_usage(UUID, TEXT, INT, TIMESTAMPTZ, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_usage(UUID, TEXT, INT, TIMESTAMPTZ, JSONB)
  TO service_role;
