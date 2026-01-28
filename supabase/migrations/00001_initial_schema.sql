-- =============================================================================
-- TRULEADO DATABASE SCHEMA
-- Version: 1.0.0
-- Description: Complete DDL for Truleado multi-tenant SaaS platform
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. CORE TENANT & IDENTITY TABLES
-- =============================================================================

-- 1.1 Agencies (Top-level tenant)
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  billing_email TEXT,
  status TEXT CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
  token_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Users (Person in Truleado, decoupled from auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Auth Identities (Maps users to Firebase auth providers)
CREATE TABLE auth_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- firebase_email, firebase_google, firebase_linkedin
  provider_uid TEXT NOT NULL, -- Firebase UID
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_uid)
);

-- Index for fast lookup by Firebase UID
CREATE INDEX idx_auth_identities_provider_uid ON auth_identities(provider_uid);

-- 1.4 Agency Users (Role mapping for agency membership)
CREATE TABLE agency_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'agency_admin',
    'account_manager', 
    'operator',
    'internal_approver'
  )),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);

-- Index for fast role lookups
CREATE INDEX idx_agency_users_user_id ON agency_users(user_id);
CREATE INDEX idx_agency_users_agency_id ON agency_users(agency_id);

-- =============================================================================
-- 2. CLIENT & ACCOUNT OWNERSHIP
-- =============================================================================

-- 2.1 Clients (Brand/Customer of the agency)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_manager_id UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, name)
);

-- Index for agency-scoped client lookups
CREATE INDEX idx_clients_agency_id ON clients(agency_id);
CREATE INDEX idx_clients_account_manager_id ON clients(account_manager_id);

-- 2.2 Client Users (External brand users - approvers/viewers)
CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('approver', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);

CREATE INDEX idx_client_users_client_id ON client_users(client_id);
CREATE INDEX idx_client_users_user_id ON client_users(user_id);

-- =============================================================================
-- 3. PROJECTS & CAMPAIGNS
-- =============================================================================

-- 3.1 Projects (Business initiative grouping campaigns)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_client_id ON projects(client_id);

-- 3.2 Campaigns (Atomic execution unit)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('influencer', 'social')),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'draft',
    'active',
    'in_review',
    'approved',
    'completed',
    'archived'
  )) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_project_id ON campaigns(project_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- =============================================================================
-- 4. CAMPAIGN USER ACCESS & ROLES
-- =============================================================================

-- 4.1 Campaign Users (Campaign-scoped permissions)
CREATE TABLE campaign_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('operator', 'approver', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX idx_campaign_users_campaign_id ON campaign_users(campaign_id);
CREATE INDEX idx_campaign_users_user_id ON campaign_users(user_id);

-- =============================================================================
-- 5. DELIVERABLES & APPROVAL SYSTEM
-- =============================================================================

-- 5.1 Deliverables (Content items within a campaign)
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deliverable_type TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'submitted',
    'internal_review',
    'client_review',
    'approved',
    'rejected'
  )) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverables_campaign_id ON deliverables(campaign_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);

-- 5.2 Deliverable Versions (Version history for deliverables)
CREATE TABLE deliverable_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id, version_number)
);

CREATE INDEX idx_deliverable_versions_deliverable_id ON deliverable_versions(deliverable_id);

-- 5.3 Approvals (Immutable approval records)
-- NOTE: This table is APPEND-ONLY. No updates or deletes allowed.
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  deliverable_version_id UUID NOT NULL REFERENCES deliverable_versions(id) ON DELETE CASCADE,
  approval_level TEXT NOT NULL CHECK (approval_level IN ('internal', 'client', 'final')),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comment TEXT,
  decided_by UUID NOT NULL REFERENCES users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approvals_deliverable_id ON approvals(deliverable_id);
CREATE INDEX idx_approvals_deliverable_version_id ON approvals(deliverable_version_id);

-- =============================================================================
-- 6. CREATOR & INFLUENCER TABLES
-- =============================================================================

-- 6.1 Creators (Influencer roster - agency-scoped)
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  instagram_handle TEXT,
  youtube_handle TEXT,
  tiktok_handle TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creators_agency_id ON creators(agency_id);

-- 6.2 Campaign Creators (Creator participation in campaigns)
CREATE TABLE campaign_creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'accepted', 'declined', 'removed')) DEFAULT 'invited',
  rate_amount NUMERIC(10, 2),
  rate_currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);

CREATE INDEX idx_campaign_creators_campaign_id ON campaign_creators(campaign_id);
CREATE INDEX idx_campaign_creators_creator_id ON campaign_creators(creator_id);

-- =============================================================================
-- 7. ANALYTICS (IMMUTABLE SNAPSHOTS)
-- =============================================================================

-- 7.1 Creator Analytics Snapshots (Pre-campaign metrics)
-- NOTE: This table is APPEND-ONLY. No updates or deletes allowed.
CREATE TABLE creator_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  analytics_type TEXT NOT NULL CHECK (analytics_type IN ('pre_campaign', 'post_campaign')),
  platform TEXT NOT NULL,
  followers INTEGER,
  engagement_rate NUMERIC(5, 2),
  avg_views INTEGER,
  avg_likes INTEGER,
  avg_comments INTEGER,
  audience_demographics JSONB,
  raw_data JSONB,
  source TEXT NOT NULL, -- e.g., 'onsocial', 'manual'
  tokens_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_analytics_campaign_creator ON creator_analytics_snapshots(campaign_creator_id);
CREATE INDEX idx_creator_analytics_type ON creator_analytics_snapshots(analytics_type);

-- 7.2 Post Metrics Snapshots (Post-campaign content metrics)
-- NOTE: This table is APPEND-ONLY. No updates or deletes allowed.
CREATE TABLE post_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id),
  content_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  impressions INTEGER,
  reach INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  saves INTEGER,
  video_views INTEGER,
  raw_data JSONB,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_metrics_campaign ON post_metrics_snapshots(campaign_id);
CREATE INDEX idx_post_metrics_creator ON post_metrics_snapshots(creator_id);

-- =============================================================================
-- 8. PAYMENTS & COMPLIANCE
-- =============================================================================

-- 8.1 Payments (Campaign-creator payment records)
-- NOTE: This table is APPEND-ONLY for payment history integrity.
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_type TEXT CHECK (payment_type IN ('advance', 'milestone', 'final')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed')) DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_campaign_creator ON payments(campaign_creator_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 8.2 Invoices (Invoice records linked to payments)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_number TEXT,
  invoice_url TEXT,
  invoice_date DATE,
  gross_amount NUMERIC(10, 2),
  gst_amount NUMERIC(10, 2),
  tds_amount NUMERIC(10, 2),
  net_amount NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_payment ON invoices(payment_id);

-- =============================================================================
-- 9. AUDIT & ACTIVITY LOGS
-- =============================================================================

-- 9.1 Activity Logs (Immutable audit trail)
-- NOTE: This table is APPEND-ONLY. No updates or deletes allowed.
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- e.g., 'campaign', 'deliverable', 'approval'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- e.g., 'created', 'status_changed', 'approved'
  actor_id UUID REFERENCES users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system')),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_agency ON activity_logs(agency_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- =============================================================================
-- 10. NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_agency ON notifications(agency_id);

-- =============================================================================
-- 11. HELPER FUNCTIONS
-- =============================================================================

-- Function to get agency_id from various entity types
CREATE OR REPLACE FUNCTION get_agency_id_for_campaign(p_campaign_id UUID)
RETURNS UUID AS $$
  SELECT c.agency_id 
  FROM campaigns cam
  JOIN projects p ON cam.project_id = p.id
  JOIN clients c ON p.client_id = c.id
  WHERE cam.id = p_campaign_id;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_agency_id_for_project(p_project_id UUID)
RETURNS UUID AS $$
  SELECT c.agency_id 
  FROM projects p
  JOIN clients c ON p.client_id = c.id
  WHERE p.id = p_project_id;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_agency_id_for_deliverable(p_deliverable_id UUID)
RETURNS UUID AS $$
  SELECT c.agency_id 
  FROM deliverables d
  JOIN campaigns cam ON d.campaign_id = cam.id
  JOIN projects p ON cam.project_id = p.id
  JOIN clients c ON p.client_id = c.id
  WHERE d.id = p_deliverable_id;
$$ LANGUAGE SQL STABLE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_users_updated_at
  BEFORE UPDATE ON agency_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
  BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_creators_updated_at
  BEFORE UPDATE ON campaign_creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
