-- =============================================================================
-- Migration 00032: Creator Discovery Module
-- =============================================================================
-- Adds tables for OnSocial-powered creator discovery:
-- - token_pricing_config: config-driven pricing for premium token operations
-- - discovery_unlocks: tracks unlocked influencer profiles (30-day validity)
-- - discovery_exports: tracks bulk export jobs
-- - saved_searches: per-agency saved filter configurations
-- - Extends creators table with discovery source tracking
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Token Pricing Config
-- ---------------------------------------------------------------------------
CREATE TABLE token_pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'premium',
  provider_cost NUMERIC(10, 6) NOT NULL,
  internal_cost NUMERIC(10, 6) NOT NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, action, token_type, agency_id)
);

CREATE INDEX idx_token_pricing_provider ON token_pricing_config(provider, action);
CREATE INDEX idx_token_pricing_agency ON token_pricing_config(agency_id);

-- Seed global default pricing for OnSocial
-- unlock: 0.02 OnSocial tokens = 0.02 Premium Tokens per influencer (1 PT = 50 unlocks)
-- unlock_with_contact: 0.04 per influencer (1 PT = 25 unlocks)
-- export_short: 0.02 per account
-- export_full: 0.04 per account
INSERT INTO token_pricing_config (provider, action, token_type, provider_cost, internal_cost, agency_id) VALUES
  ('onsocial', 'unlock', 'premium', 0.02, 0.02, NULL),
  ('onsocial', 'unlock_with_contact', 'premium', 0.04, 0.04, NULL),
  ('onsocial', 'export_short', 'premium', 0.02, 0.02, NULL),
  ('onsocial', 'export_full', 'premium', 0.04, 0.04, NULL),
  ('onsocial', 'import', 'premium', 0.02, 0.02, NULL),
  ('onsocial', 'import_with_contact', 'premium', 0.04, 0.04, NULL);

-- ---------------------------------------------------------------------------
-- 2. Discovery Unlocks
-- ---------------------------------------------------------------------------
CREATE TABLE discovery_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  onsocial_user_id TEXT NOT NULL,
  search_result_id TEXT NOT NULL,
  username TEXT,
  fullname TEXT,
  profile_data JSONB,
  tokens_spent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  unlocked_by UUID NOT NULL REFERENCES users(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discovery_unlocks_agency ON discovery_unlocks(agency_id);
CREATE INDEX idx_discovery_unlocks_lookup ON discovery_unlocks(onsocial_user_id, agency_id);
CREATE INDEX idx_discovery_unlocks_expires ON discovery_unlocks(expires_at);

-- ---------------------------------------------------------------------------
-- 3. Discovery Exports
-- ---------------------------------------------------------------------------
CREATE TABLE discovery_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  export_type TEXT NOT NULL CHECK (export_type IN ('SHORT', 'FULL')),
  filter_snapshot JSONB NOT NULL,
  total_accounts INT NOT NULL DEFAULT 0,
  tokens_spent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  onsocial_export_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  download_url TEXT,
  error_message TEXT,
  exported_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_discovery_exports_agency ON discovery_exports(agency_id);
CREATE INDEX idx_discovery_exports_status ON discovery_exports(status);
CREATE INDEX idx_discovery_exports_created ON discovery_exports(created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Saved Searches
-- ---------------------------------------------------------------------------
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  filters JSONB NOT NULL,
  sort_field TEXT,
  sort_order TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_agency ON saved_searches(agency_id);

-- ---------------------------------------------------------------------------
-- 5. Extend creators table with discovery provenance
-- ---------------------------------------------------------------------------
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS discovery_source TEXT,
  ADD COLUMN IF NOT EXISTS onsocial_user_id TEXT,
  ADD COLUMN IF NOT EXISTS discovery_imported_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------

-- token_pricing_config: agency members can read their config + global defaults
ALTER TABLE token_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_pricing_config_select" ON token_pricing_config
  FOR SELECT USING (
    agency_id IS NULL
    OR agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

-- discovery_unlocks: agency members can read/insert their unlocks
ALTER TABLE discovery_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_unlocks_select" ON discovery_unlocks
  FOR SELECT USING (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_unlocks_insert" ON discovery_unlocks
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

-- discovery_exports: agency members can read/insert their exports
ALTER TABLE discovery_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_exports_select" ON discovery_exports
  FOR SELECT USING (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_exports_insert" ON discovery_exports
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_exports_update" ON discovery_exports
  FOR UPDATE USING (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

-- saved_searches: agency members can full CRUD their saved searches
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_select" ON saved_searches
  FOR SELECT USING (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "saved_searches_insert" ON saved_searches
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "saved_searches_update" ON saved_searches
  FOR UPDATE USING (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "saved_searches_delete" ON saved_searches
  FOR DELETE USING (
    agency_id IN (
      SELECT au.agency_id FROM agency_users au WHERE au.user_id = auth.uid()
    )
  );
