-- Migration: Add extended fields to projects table
-- Supports the comprehensive 7-section project creation form

-- Core fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_poc_id UUID REFERENCES contacts(id);

-- Budget fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS influencer_budget NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS agency_fee NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS agency_fee_type TEXT DEFAULT 'fixed';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_budget NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS boosting_budget NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contingency NUMERIC;

-- Scope fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS campaign_objectives JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS influencer_tiers JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_campaigns INTEGER;

-- KPI Targets
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_reach BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_impressions BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_engagement_rate NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_conversions BIGINT;

-- Approvals & Process
ALTER TABLE projects ADD COLUMN IF NOT EXISTS influencer_approval_contact_id UUID REFERENCES contacts(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS content_approval_contact_id UUID REFERENCES contacts(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_turnaround TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reporting_cadence TEXT;

-- Documents & Commercial
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brief_file_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_file_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS exclusivity_clause BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS exclusivity_terms TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS content_usage_rights TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS renewal_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS external_folder_link TEXT;

-- Internal fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS internal_notes TEXT;
