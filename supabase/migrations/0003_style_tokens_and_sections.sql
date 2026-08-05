-- Migration 0003 — measured style tokens + sectioned screenshots
--
-- Why: the guide template demands "Border Radius", "Shadows" and a "Spacing
-- Scale", but the scanner only ever extracted fonts and colours. The model
-- invented the other three from a single above-the-fold screenshot — which is
-- how a site whose cards are all rounded got documented as border-radius 0px.
--
-- `style_tokens` holds what we now measure off the live DOM.
-- `screenshot_urls` holds the page as consecutive viewport-height bands (hero
-- first, and always equal to screenshot_url so existing readers keep working).
--
-- Safe/idempotent. Apply in the Supabase SQL editor or via `supabase db push`.

ALTER TABLE site_analyses
  ADD COLUMN IF NOT EXISTS style_tokens JSONB,
  ADD COLUMN IF NOT EXISTS screenshot_urls JSONB;

COMMENT ON COLUMN site_analyses.style_tokens IS
  'Measured design tokens: { radii[], shadows[], spacing[] }. Ground truth — the model must not invent these.';
COMMENT ON COLUMN site_analyses.screenshot_urls IS
  'Ordered viewport-height captures of the page, hero first. screenshot_url stays the hero for card previews.';

-- Rows scanned before this migration keep NULL style_tokens; the prompt builder
-- omits the section rather than asserting anything, so old analyses degrade to
-- exactly the previous behaviour until they are re-scanned.
