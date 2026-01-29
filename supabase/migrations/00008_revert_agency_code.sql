-- =============================================================================
-- Revert migration 00007_agency_code
-- Purpose: Undo all changes from 00007 (agency_code, index, function, RLS)
-- Run this on Supabase if you had already applied 00007 and reverted app code.
-- =============================================================================

-- 1. Drop the RLS policy added for join-by-code lookup
DROP POLICY IF EXISTS "Anyone can view agency by code" ON agencies;

-- 2. Drop the agency_code column (also drops idx_agencies_agency_code and UNIQUE)
ALTER TABLE agencies
  DROP COLUMN IF EXISTS agency_code;

-- 3. Drop the generate_agency_code() function
DROP FUNCTION IF EXISTS generate_agency_code();
