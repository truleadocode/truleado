-- Dummy data tracking flag on agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS has_dummy_data BOOLEAN DEFAULT false;

-- is_dummy flag on entity tables for cleanup targeting
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT false;

-- Partial indexes for fast cleanup queries
CREATE INDEX IF NOT EXISTS idx_clients_dummy ON clients(agency_id) WHERE is_dummy = true;
CREATE INDEX IF NOT EXISTS idx_creators_dummy ON creators(agency_id) WHERE is_dummy = true;
