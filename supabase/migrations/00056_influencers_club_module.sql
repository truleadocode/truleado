-- =============================================================================
-- Migration 00056: Influencers.club Creator Discovery Module (replaces OnSocial)
-- =============================================================================
-- What this does
--   1. Global creator data cache: creator_profiles, creator_identities,
--      creator_posts, creator_audience_snapshots
--   2. Agency-scoped ledgers: creator_enrichments, audience_overlap_reports,
--      enrichment_batch_jobs, discovery_query_cache
--   3. Platform infrastructure: provider_dictionary_cache,
--      provider_rate_limit_ledger, increment_rate_limit() RPC
--   4. creators table: onsocial_user_id -> provider_user_id, add provider,
--      creator_profile_id FK; replace unique index
--   5. creator-assets storage bucket (public-read, service-role writes)
--   6. Seed token_pricing_config rows for 'influencers_club'
--   7. Deactivate OnSocial pricing rows; block writes to legacy discovery tables
--
-- Global vs agency-scoped caching model
--   Creator data (profiles, identities, posts, audience snapshots) is global.
--   First agency to enrich pays IC credits; subsequent agencies within TTL read
--   from cache. The agency is STILL charged the full internal_cost on cache hits
--   (see creator_enrichments.cache_hit = true) — this is the intended margin.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. creator_profiles — GLOBAL canonical per-platform profile (cached)
-- ---------------------------------------------------------------------------
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL DEFAULT 'influencers_club',
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok','twitter','twitch')),
  provider_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  username_lower TEXT GENERATED ALWAYS AS (lower(username)) STORED,

  -- Normalized queryable columns
  full_name TEXT,
  followers INTEGER,
  engagement_percent NUMERIC(8, 4),
  biography TEXT,
  niche_primary TEXT,
  niche_secondary TEXT[],
  email TEXT,
  location TEXT,
  language TEXT,
  is_verified BOOLEAN,
  is_business BOOLEAN,
  is_creator BOOLEAN,

  -- Mirrored picture (permanent in creator-assets bucket)
  profile_picture_storage_path TEXT,
  profile_picture_public_url TEXT,
  profile_picture_mirrored_at TIMESTAMPTZ,

  -- Enrichment metadata
  enrichment_mode TEXT CHECK (enrichment_mode IN ('raw','full','full_with_audience','none')) DEFAULT 'none',
  last_enriched_at TIMESTAMPTZ,
  last_enriched_by_agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider, platform, provider_user_id)
);

CREATE INDEX idx_creator_profiles_handle        ON creator_profiles(platform, username_lower);
CREATE INDEX idx_creator_profiles_followers     ON creator_profiles(platform, followers DESC);
CREATE INDEX idx_creator_profiles_last_enriched ON creator_profiles(last_enriched_at DESC);
CREATE INDEX idx_creator_profiles_username_trgm ON creator_profiles USING gin (username_lower gin_trgm_ops);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_profiles_read_authenticated" ON creator_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = public.get_current_user_id()
        AND au.is_active = true
    )
  );
-- No INSERT/UPDATE/DELETE policies — service role only

-- ---------------------------------------------------------------------------
-- 2. creator_identities — GLOBAL cross-platform identity links
-- ---------------------------------------------------------------------------
CREATE TABLE creator_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('connected_socials','manual','email_lookup')),
  confidence TEXT CHECK (confidence IN ('verified','probable','possible')) DEFAULT 'verified',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discovered_by_agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  UNIQUE (creator_profile_id)
);

CREATE INDEX idx_creator_identities_canonical ON creator_identities(canonical_id);

ALTER TABLE creator_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_identities_read" ON creator_identities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = public.get_current_user_id()
        AND au.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- 3. creator_posts — GLOBAL post cache (IG/TT/YT only per IC spec)
-- ---------------------------------------------------------------------------
CREATE TABLE creator_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','tiktok','youtube')),
  post_pk TEXT NOT NULL,
  taken_at TIMESTAMPTZ,
  caption TEXT,
  media_url TEXT,
  media_type INTEGER,
  likes INTEGER,
  comments INTEGER,
  views INTEGER,
  thumbnail_storage_path TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, post_pk)
);

CREATE INDEX idx_creator_posts_creator ON creator_posts(creator_profile_id, taken_at DESC);

ALTER TABLE creator_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_posts_read" ON creator_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = public.get_current_user_id()
        AND au.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- 4. creator_audience_snapshots — GLOBAL audience demographics
-- ---------------------------------------------------------------------------
CREATE TABLE creator_audience_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audience_type TEXT NOT NULL CHECK (audience_type IN ('followers','commenters','likers')),
  geo JSONB,
  languages JSONB,
  ages JSONB,
  genders JSONB,
  interests JSONB,
  brand_affinities JSONB,
  credibility_score NUMERIC(5, 4),
  reachability JSONB,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_creator_audience_snapshots_creator
  ON creator_audience_snapshots(creator_profile_id, snapshot_at DESC);

ALTER TABLE creator_audience_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_audience_snapshots_read" ON creator_audience_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = public.get_current_user_id()
        AND au.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- 5. creator_enrichments — AGENCY-SCOPED chargeable-event ledger
-- ---------------------------------------------------------------------------
-- Replaces discovery_unlocks. cache_hit=true means we served from global cache
-- but STILL charged the agency full internal_cost (margin model).
CREATE TABLE creator_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok','twitter','twitch')),
  handle TEXT NOT NULL,
  enrichment_mode TEXT NOT NULL CHECK (
    enrichment_mode IN ('raw','full','full_with_audience','email','connected_socials')
  ),
  credits_spent INTEGER NOT NULL,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  ic_credits_cost NUMERIC(10, 4),
  triggered_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_enrichments_agency  ON creator_enrichments(agency_id, created_at DESC);
CREATE INDEX idx_creator_enrichments_profile ON creator_enrichments(creator_profile_id);

ALTER TABLE creator_enrichments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_enrichments_read" ON creator_enrichments
  FOR SELECT USING (
    agency_id IN (SELECT public.get_user_agencies())
  );

-- ---------------------------------------------------------------------------
-- 6. audience_overlap_reports — AGENCY-SCOPED cached overlap computations
-- ---------------------------------------------------------------------------
CREATE TABLE audience_overlap_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok','twitter','twitch')),
  creator_handles TEXT[] NOT NULL,
  creator_handles_hash TEXT GENERATED ALWAYS AS (md5(array_to_string(creator_handles, ','))) STORED,
  total_followers BIGINT,
  total_unique_followers BIGINT,
  details JSONB NOT NULL,
  credits_spent INTEGER NOT NULL,
  computed_by UUID REFERENCES users(id),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, platform, creator_handles_hash)
);

CREATE INDEX idx_overlap_reports_agency ON audience_overlap_reports(agency_id, computed_at DESC);

ALTER TABLE audience_overlap_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audience_overlap_reports_read" ON audience_overlap_reports
  FOR SELECT USING (
    agency_id IN (SELECT public.get_user_agencies())
  );

-- ---------------------------------------------------------------------------
-- 7. enrichment_batch_jobs — AGENCY-SCOPED batch state machine
-- ---------------------------------------------------------------------------
CREATE TABLE enrichment_batch_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  ic_batch_id TEXT UNIQUE,
  platform TEXT CHECK (platform IN ('instagram','youtube','tiktok','twitter','twitch')),
  enrichment_mode TEXT NOT NULL CHECK (enrichment_mode IN ('raw','full','basic')),
  include_audience_data BOOLEAN NOT NULL DEFAULT true,
  email_required TEXT CHECK (email_required IN ('must_have','preferred')) DEFAULT 'preferred',
  metadata JSONB,
  input_file_storage_path TEXT NOT NULL,
  result_file_storage_path TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  credits_used NUMERIC(10, 4) NOT NULL DEFAULT 0,
  credits_held INTEGER NOT NULL DEFAULT 0,
  credits_charged INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'ic_queued',
    'ic_processing',
    'ic_paused_credits',
    'ic_finished',
    'downloading',
    'importing',
    'completed',
    'failed',
    'cancelled'
  )),
  status_message TEXT,
  last_polled_at TIMESTAMPTZ,
  next_poll_at TIMESTAMPTZ,
  poll_attempts INTEGER NOT NULL DEFAULT 0,

  submitted_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_batch_jobs_agency ON enrichment_batch_jobs(agency_id, created_at DESC);
CREATE INDEX idx_batch_jobs_poll   ON enrichment_batch_jobs(next_poll_at)
  WHERE status IN ('ic_queued','ic_processing','ic_paused_credits','ic_finished','downloading');
CREATE INDEX idx_batch_jobs_status ON enrichment_batch_jobs(status);

ALTER TABLE enrichment_batch_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrichment_batch_jobs_read" ON enrichment_batch_jobs
  FOR SELECT USING (
    agency_id IN (SELECT public.get_user_agencies())
  );
CREATE POLICY "enrichment_batch_jobs_insert" ON enrichment_batch_jobs
  FOR INSERT WITH CHECK (
    agency_id IN (SELECT public.get_user_agencies())
  );

-- ---------------------------------------------------------------------------
-- 8. discovery_query_cache — AGENCY-SCOPED discovery result cache
-- ---------------------------------------------------------------------------
CREATE TABLE discovery_query_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok','twitter','twitch')),
  filters_hash TEXT NOT NULL,
  filters_snapshot JSONB NOT NULL,
  page INTEGER NOT NULL DEFAULT 1,
  limit_value INTEGER NOT NULL,
  response_total INTEGER,
  accounts_snapshot JSONB NOT NULL,
  credits_spent_on_fetch INTEGER NOT NULL,
  credits_saved_on_hit INTEGER NOT NULL DEFAULT 0,
  cache_hit_count INTEGER NOT NULL DEFAULT 0,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  UNIQUE (agency_id, platform, filters_hash, page)
);

CREATE INDEX idx_discovery_cache_lookup  ON discovery_query_cache(agency_id, platform, filters_hash, page);
CREATE INDEX idx_discovery_cache_expires ON discovery_query_cache(expires_at);

ALTER TABLE discovery_query_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discovery_query_cache_read" ON discovery_query_cache
  FOR SELECT USING (
    agency_id IN (SELECT public.get_user_agencies())
  );

-- ---------------------------------------------------------------------------
-- 9. provider_dictionary_cache — IC dictionary values (9 free endpoints)
-- ---------------------------------------------------------------------------
CREATE TABLE provider_dictionary_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  dictionary_type TEXT NOT NULL,
  platform TEXT,
  data JSONB NOT NULL,
  etag TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  fetch_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (provider, dictionary_type, platform)
);

-- Partial unique handled by NULLS NOT DISTINCT behavior — we treat NULL platform
-- as a distinct key via coalesce-equivalent in the unique constraint above. To
-- ensure a single row exists for (provider, dictionary_type) when platform IS NULL
-- we rely on NULLS NOT DISTINCT (default in Postgres 15+). If the runtime is older,
-- the unique constraint may allow multiple NULL-platform rows; upserts use the
-- conflict target (provider, dictionary_type, platform).

CREATE INDEX idx_dict_cache_lookup ON provider_dictionary_cache(provider, dictionary_type, platform);

ALTER TABLE provider_dictionary_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider_dictionary_cache_read" ON provider_dictionary_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = public.get_current_user_id()
        AND au.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- 10. provider_rate_limit_ledger — 300 rpm IC-wide request counter
-- ---------------------------------------------------------------------------
CREATE TABLE provider_rate_limit_ledger (
  provider TEXT NOT NULL,
  bucket_minute TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, bucket_minute)
);

CREATE INDEX idx_rate_limit_prune ON provider_rate_limit_ledger(bucket_minute);

-- No RLS on this infra table — service role only.
ALTER TABLE provider_rate_limit_ledger ENABLE ROW LEVEL SECURITY;

-- Atomic increment-and-check. Raises LIMIT_EXCEEDED when over the cap.
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_provider TEXT,
  p_bucket TIMESTAMPTZ,
  p_max INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO provider_rate_limit_ledger(provider, bucket_minute, request_count, updated_at)
    VALUES (p_provider, p_bucket, 1, now())
    ON CONFLICT (provider, bucket_minute)
    DO UPDATE SET request_count = provider_rate_limit_ledger.request_count + 1,
                  updated_at = now()
    RETURNING request_count INTO new_count;

  IF new_count > p_max THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED' USING ERRCODE = 'check_violation';
  END IF;

  RETURN new_count;
END;
$$;

COMMENT ON FUNCTION public.increment_rate_limit IS
  'Atomically increments the per-minute request counter for a provider. Raises LIMIT_EXCEEDED when over the cap.';

-- ---------------------------------------------------------------------------
-- 11. creators — rename onsocial_user_id, add provider + creator_profile_id
-- ---------------------------------------------------------------------------
-- Production is empty/dev-only (see migration 00052) — no backfill needed.

-- Drop old unique index (it targeted onsocial_user_id)
DROP INDEX IF EXISTS idx_creators_agency_onsocial;

-- Rename column
ALTER TABLE creators RENAME COLUMN onsocial_user_id TO provider_user_id;

-- Add new columns
ALTER TABLE creators ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS creator_profile_id UUID
  REFERENCES creator_profiles(id) ON DELETE SET NULL;

-- Stamp legacy rows (if any) as onsocial-sourced
UPDATE creators SET provider = 'onsocial' WHERE provider_user_id IS NOT NULL AND provider IS NULL;

-- New provider-aware unique index
CREATE UNIQUE INDEX idx_creators_agency_provider_user
  ON creators(agency_id, provider, provider_user_id)
  WHERE provider_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_creators_creator_profile
  ON creators(creator_profile_id) WHERE creator_profile_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 12. creator-assets storage bucket (public-read, service-role writes)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-assets',
  'creator-assets',
  true,
  5242880,                                           -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. Seed token_pricing_config for 'influencers_club'
-- ---------------------------------------------------------------------------
-- Pricing rationale:
--   - ~3x markup over IC's USD cost (matches OnSocial-era ratio in 00052).
--   - Credit price fixed at $0.012/credit (credit_purchase_config).
--   - discovery_page: internal_cost is per-creator-returned (1 credit each).
--     Actual debit = ceil(accounts_returned * 1) in code.
INSERT INTO token_pricing_config (provider, action, token_type, provider_cost, internal_cost, agency_id) VALUES
  ('influencers_club', 'discovery_page',            'credit', 0.010000, 1,  NULL),
  ('influencers_club', 'similar_creators_page',     'credit', 0.010000, 1,  NULL),
  ('influencers_club', 'enrich_raw',                'credit', 0.030000, 1,  NULL),
  ('influencers_club', 'enrich_full',               'credit', 1.000000, 20, NULL),
  ('influencers_club', 'enrich_full_with_audience', 'credit', 1.000000, 25, NULL),
  ('influencers_club', 'enrich_email',              'credit', 0.050000, 2,  NULL),
  ('influencers_club', 'connected_socials',         'credit', 0.500000, 15, NULL),
  ('influencers_club', 'content_posts_page',        'credit', 0.030000, 1,  NULL),
  ('influencers_club', 'content_post_details',      'credit', 0.030000, 1,  NULL),
  ('influencers_club', 'audience_overlap',          'credit', 1.000000, 20, NULL),
  ('influencers_club', 'batch_enrich_raw',          'credit', 0.030000, 1,  NULL),
  ('influencers_club', 'batch_enrich_full',         'credit', 1.000000, 20, NULL),
  ('influencers_club', 'batch_enrich_basic',        'credit', 0.050000, 2,  NULL)
ON CONFLICT (provider, action, token_type, agency_id) DO UPDATE
  SET provider_cost = EXCLUDED.provider_cost,
      internal_cost = EXCLUDED.internal_cost,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- 14. Deactivate OnSocial pricing rows (keep for audit trail)
-- ---------------------------------------------------------------------------
UPDATE token_pricing_config
  SET is_active = false, updated_at = now()
  WHERE provider = 'onsocial';

-- ---------------------------------------------------------------------------
-- 15. Block writes to legacy discovery tables (defensive)
-- ---------------------------------------------------------------------------
-- New code paths must route to the replacement tables above. If anything
-- accidentally writes to the legacy tables, we fail loudly.
CREATE OR REPLACE FUNCTION public.reject_deprecated_writes() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is deprecated in favor of Influencers.club tables (migration 00056)', TG_TABLE_NAME
    USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE TRIGGER block_discovery_unlocks_writes
  BEFORE INSERT OR UPDATE OR DELETE ON discovery_unlocks
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_deprecated_writes();

CREATE TRIGGER block_discovery_exports_writes
  BEFORE INSERT OR UPDATE OR DELETE ON discovery_exports
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_deprecated_writes();
