-- =============================================================================
-- 00030: Deliverable Analytics
-- =============================================================================
-- Adds tables for deliverable-level post analytics fetching, normalized
-- metrics storage (time-series), and campaign-level aggregate rollups.
-- Supports Instagram (ScrapeCreators), TikTok (ScrapeCreators), YouTube (Data API v3).
-- =============================================================================

-- 1. Analytics Fetch Jobs (background job tracking)
CREATE TABLE analytics_fetch_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE, -- NULL = campaign-wide
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed')) DEFAULT 'pending',
  total_urls INTEGER NOT NULL DEFAULT 0,
  completed_urls INTEGER NOT NULL DEFAULT 0,
  failed_urls INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  tokens_consumed INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_fetch_jobs_campaign ON analytics_fetch_jobs(campaign_id);
CREATE INDEX idx_analytics_fetch_jobs_agency ON analytics_fetch_jobs(agency_id);
CREATE INDEX idx_analytics_fetch_jobs_status ON analytics_fetch_jobs(status);

CREATE TRIGGER update_analytics_fetch_jobs_updated_at
  BEFORE UPDATE ON analytics_fetch_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Deliverable Analytics Raw (immutable, append-only raw API responses)
CREATE TABLE deliverable_analytics_raw (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES analytics_fetch_jobs(id) ON DELETE CASCADE,
  tracking_url_id UUID NOT NULL REFERENCES deliverable_tracking_urls(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  content_url TEXT NOT NULL,
  raw_response JSONB NOT NULL,
  api_source TEXT NOT NULL CHECK (api_source IN ('scrapecreators', 'youtube_data_api')),
  fetch_status TEXT NOT NULL CHECK (fetch_status IN ('success', 'error', 'rate_limited')) DEFAULT 'success',
  error_message TEXT,
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverable_analytics_raw_job ON deliverable_analytics_raw(job_id);
CREATE INDEX idx_deliverable_analytics_raw_tracking_url ON deliverable_analytics_raw(tracking_url_id);
CREATE INDEX idx_deliverable_analytics_raw_deliverable ON deliverable_analytics_raw(deliverable_id);
CREATE INDEX idx_deliverable_analytics_raw_campaign ON deliverable_analytics_raw(campaign_id);
CREATE INDEX idx_deliverable_analytics_raw_fetched ON deliverable_analytics_raw(fetched_at DESC);

-- 3. Deliverable Metrics (normalized time-series snapshots, immutable)
CREATE TABLE deliverable_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_id UUID NOT NULL REFERENCES deliverable_analytics_raw(id) ON DELETE CASCADE,
  tracking_url_id UUID NOT NULL REFERENCES deliverable_tracking_urls(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  content_url TEXT NOT NULL,
  -- Normalized common metrics
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  saves INTEGER,
  reach INTEGER,
  impressions INTEGER,
  -- Platform-specific extras
  platform_metrics JSONB DEFAULT '{}',
  -- Calculated derived metrics (engagement_rate, save_rate, virality_index, etc.)
  calculated_metrics JSONB DEFAULT '{}',
  -- Creator follower count at time of fetch (for virality index denominator)
  creator_followers_at_fetch INTEGER,
  -- Snapshot timestamp
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverable_metrics_tracking_url ON deliverable_metrics(tracking_url_id);
CREATE INDEX idx_deliverable_metrics_deliverable ON deliverable_metrics(deliverable_id);
CREATE INDEX idx_deliverable_metrics_campaign ON deliverable_metrics(campaign_id);
CREATE INDEX idx_deliverable_metrics_creator ON deliverable_metrics(creator_id);
CREATE INDEX idx_deliverable_metrics_snapshot ON deliverable_metrics(snapshot_at DESC);
CREATE INDEX idx_deliverable_metrics_campaign_snapshot ON deliverable_metrics(campaign_id, snapshot_at DESC);

-- 4. Campaign Analytics Aggregates (upserted rollups, one per campaign)
CREATE TABLE campaign_analytics_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  -- Totals
  total_deliverables_tracked INTEGER NOT NULL DEFAULT 0,
  total_urls_tracked INTEGER NOT NULL DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_comments BIGINT DEFAULT 0,
  total_shares BIGINT DEFAULT 0,
  total_saves BIGINT DEFAULT 0,
  -- Weighted rates
  weighted_engagement_rate NUMERIC(8,4),
  avg_engagement_rate NUMERIC(8,4),
  avg_save_rate NUMERIC(8,4),
  avg_virality_index NUMERIC(10,4),
  -- Cost metrics
  total_creator_cost NUMERIC(12,2),
  cost_currency TEXT,
  cpv NUMERIC(10,4),
  cpe NUMERIC(10,4),
  -- Per-platform breakdown
  platform_breakdown JSONB DEFAULT '{}',
  -- Per-creator breakdown
  creator_breakdown JSONB DEFAULT '{}',
  -- Growth deltas (from previous aggregate)
  views_delta BIGINT DEFAULT 0,
  likes_delta BIGINT DEFAULT 0,
  engagement_rate_delta NUMERIC(8,4) DEFAULT 0,
  -- Metadata
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id)
);

CREATE INDEX idx_campaign_analytics_aggregates_campaign ON campaign_analytics_aggregates(campaign_id);

CREATE TRIGGER update_campaign_analytics_aggregates_updated_at
  BEFORE UPDATE ON campaign_analytics_aggregates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE analytics_fetch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_analytics_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics_aggregates ENABLE ROW LEVEL SECURITY;

-- analytics_fetch_jobs: agency-scoped
CREATE POLICY analytics_fetch_jobs_select ON analytics_fetch_jobs
  FOR SELECT
  USING (public.belongs_to_agency(analytics_fetch_jobs.agency_id));

CREATE POLICY analytics_fetch_jobs_insert ON analytics_fetch_jobs
  FOR INSERT
  WITH CHECK (public.belongs_to_agency(analytics_fetch_jobs.agency_id));

CREATE POLICY analytics_fetch_jobs_update ON analytics_fetch_jobs
  FOR UPDATE
  USING (public.belongs_to_agency(analytics_fetch_jobs.agency_id));

-- deliverable_analytics_raw: campaign-scoped (immutable — no UPDATE/DELETE)
CREATE POLICY deliverable_analytics_raw_select ON deliverable_analytics_raw
  FOR SELECT
  USING (public.has_campaign_access(deliverable_analytics_raw.campaign_id));

CREATE POLICY deliverable_analytics_raw_insert ON deliverable_analytics_raw
  FOR INSERT
  WITH CHECK (public.has_campaign_access(deliverable_analytics_raw.campaign_id));

-- deliverable_metrics: campaign-scoped (immutable — no UPDATE/DELETE)
CREATE POLICY deliverable_metrics_select ON deliverable_metrics
  FOR SELECT
  USING (public.has_campaign_access(deliverable_metrics.campaign_id));

CREATE POLICY deliverable_metrics_insert ON deliverable_metrics
  FOR INSERT
  WITH CHECK (public.has_campaign_access(deliverable_metrics.campaign_id));

-- campaign_analytics_aggregates: campaign-scoped
CREATE POLICY campaign_analytics_aggregates_select ON campaign_analytics_aggregates
  FOR SELECT
  USING (public.has_campaign_access(campaign_analytics_aggregates.campaign_id));

CREATE POLICY campaign_analytics_aggregates_insert ON campaign_analytics_aggregates
  FOR INSERT
  WITH CHECK (public.has_campaign_access(campaign_analytics_aggregates.campaign_id));

CREATE POLICY campaign_analytics_aggregates_update ON campaign_analytics_aggregates
  FOR UPDATE
  USING (public.has_campaign_access(campaign_analytics_aggregates.campaign_id));
