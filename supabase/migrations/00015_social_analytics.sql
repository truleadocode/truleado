-- =============================================================================
-- 00015: Social Media Analytics
-- =============================================================================
-- Adds tables for background social data fetching and creator-level social
-- profile / post storage (Instagram via Apify, YouTube via Data API v3).
-- =============================================================================

-- 1. Social Data Jobs (background job tracking)
CREATE TABLE social_data_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  job_type TEXT NOT NULL CHECK (job_type IN ('basic_scrape', 'enriched_profile')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  tokens_consumed INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_data_jobs_creator ON social_data_jobs(creator_id);
CREATE INDEX idx_social_data_jobs_status ON social_data_jobs(status);
CREATE INDEX idx_social_data_jobs_agency ON social_data_jobs(agency_id);

CREATE TRIGGER update_social_data_jobs_updated_at
  BEFORE UPDATE ON social_data_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Creator Social Profiles (latest profile per platform, upserted on fetch)
CREATE TABLE creator_social_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  -- Common fields
  platform_username TEXT,
  platform_display_name TEXT,
  profile_pic_url TEXT,
  bio TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  is_verified BOOLEAN DEFAULT false,
  is_business_account BOOLEAN,
  external_url TEXT,
  -- YouTube-specific
  subscribers_count INTEGER,
  total_views BIGINT,
  channel_id TEXT,
  -- Computed engagement metrics
  avg_likes NUMERIC(12,2),
  avg_comments NUMERIC(12,2),
  avg_views NUMERIC(12,2),
  engagement_rate NUMERIC(8,4),
  -- Raw data
  raw_profile_data JSONB,
  raw_posts_data JSONB,
  -- Metadata
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_job_id UUID REFERENCES social_data_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform)
);

CREATE INDEX idx_creator_social_profiles_creator ON creator_social_profiles(creator_id);
CREATE INDEX idx_creator_social_profiles_platform ON creator_social_profiles(platform);

CREATE TRIGGER update_creator_social_profiles_updated_at
  BEFORE UPDATE ON creator_social_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Creator Social Posts (individual posts/videos for charts)
CREATE TABLE creator_social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  platform_post_id TEXT NOT NULL,
  post_type TEXT,
  caption TEXT,
  url TEXT,
  thumbnail_url TEXT,
  -- Metrics
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER,
  shares_count INTEGER,
  saves_count INTEGER,
  -- Metadata
  hashtags TEXT[],
  mentions TEXT[],
  published_at TIMESTAMPTZ,
  raw_data JSONB,
  -- Tracking
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform, platform_post_id)
);

CREATE INDEX idx_creator_social_posts_creator ON creator_social_posts(creator_id, platform);
CREATE INDEX idx_creator_social_posts_published ON creator_social_posts(published_at DESC);

CREATE TRIGGER update_creator_social_posts_updated_at
  BEFORE UPDATE ON creator_social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
