-- Phase 2 (Phase I) — Twitter / Twitch handles on creators table
--
-- The agency creator-roster page filters by platform tabs that read from
-- creators.<platform>_handle columns. Today only IG/YT/TT/Facebook/LinkedIn
-- have those columns — Twitter and Twitch creators imported from Discovery
-- silently lose their handle (importCreatorsToAgency's handleColumnFor()
-- returns null for those platforms today).
--
-- This adds the two missing columns. Existing rows stay null; the
-- importCreatorsToAgency mutation will populate going forward, and users
-- can re-import any orphaned Twitter/Twitch creators.

ALTER TABLE creators ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS twitch_handle TEXT;
