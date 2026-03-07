-- Migration: Add extended fields to campaigns table
-- Supports campaign create drawer fields (objective, KPIs, UTMs, etc.)

-- Campaign details
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS hashtags JSONB DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS posting_instructions TEXT;

-- Exclusivity & Rights
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS exclusivity_clause BOOLEAN;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS exclusivity_terms TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_usage_rights TEXT;

-- Gifting
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS gifting_enabled BOOLEAN;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS gifting_details TEXT;

-- KPI Targets
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_reach BIGINT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_impressions BIGINT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_engagement_rate NUMERIC;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_views BIGINT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_conversions BIGINT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_sales BIGINT;

-- UTM Tracking
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS utm_content TEXT;
