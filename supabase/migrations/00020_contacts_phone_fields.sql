-- =============================================================================
-- Add additional phone fields for contacts and reset legacy mobile values
-- =============================================================================

ALTER TABLE contacts
  ADD COLUMN phone TEXT,
  ADD COLUMN office_phone TEXT,
  ADD COLUMN home_phone TEXT;

-- Reset existing mobile values (per product decision)
UPDATE contacts SET mobile = NULL;
