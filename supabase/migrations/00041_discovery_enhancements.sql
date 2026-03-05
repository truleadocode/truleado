-- =============================================================================
-- Migration 00041: Discovery Module Enhancements
-- =============================================================================
-- Adds discovery-related columns to creators table:
--   - platform, followers, engagement_rate, avg_likes for search snapshot data
--   - contact_links (JSONB) for full contact data from /exports/contacts/
--   - discovery_query (JSONB) for audit trail of original search filters
-- Adds unique constraint on (agency_id, onsocial_user_id) to prevent duplicates
-- =============================================================================

-- 1. Add new columns
ALTER TABLE creators ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS followers INTEGER;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(8,4);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS avg_likes INTEGER;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS contact_links JSONB;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS discovery_query JSONB;

-- 2. Deduplicate before adding unique index (safety net)
DELETE FROM creators a USING creators b
WHERE a.id > b.id
  AND a.agency_id = b.agency_id
  AND a.onsocial_user_id = b.onsocial_user_id
  AND a.onsocial_user_id IS NOT NULL;

-- 3. Add unique constraint for agency + onsocial_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_agency_onsocial
  ON creators(agency_id, onsocial_user_id)
  WHERE onsocial_user_id IS NOT NULL;
