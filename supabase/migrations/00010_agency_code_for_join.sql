-- Migration: Add agency_code for "Join existing Agency" flow
-- Date: 2026-01-29
-- Re-adds agency_code (reverted in 00008) for sprint: user can join by code.

-- 1. Generate unique short code (e.g. ABC123)
CREATE OR REPLACE FUNCTION generate_agency_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Add column with unique constraint
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS agency_code TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_agency_code ON agencies(agency_code) WHERE agency_code IS NOT NULL;

-- 3. Backfill existing agencies with a code (one-time)
UPDATE agencies
SET agency_code = generate_agency_code()
WHERE agency_code IS NULL;

-- 4. Trigger to set agency_code on insert if not provided
CREATE OR REPLACE FUNCTION set_agency_code_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.agency_code IS NULL OR NEW.agency_code = '' THEN
    NEW.agency_code := generate_agency_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_agency_code ON agencies;
CREATE TRIGGER trigger_set_agency_code
  BEFORE INSERT ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION set_agency_code_on_insert();

-- Lookup by code is done server-side in joinAgencyByCode mutation (service role). No public RLS for code.

COMMENT ON COLUMN agencies.agency_code IS 'Short unique code for users to join the agency (e.g. ABC123).';
