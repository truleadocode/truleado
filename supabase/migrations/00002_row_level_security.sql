-- =============================================================================
-- TRULEADO ROW LEVEL SECURITY (RLS) POLICIES
-- Version: 1.0.0
-- Description: Multi-tenant isolation policies for all tables
-- =============================================================================

-- IMPORTANT: RLS policies are enforced at the database level.
-- The application sets the current user context via custom claims.
-- We use Supabase's auth.uid() for Firebase UID mapping.

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS (in public schema)
-- =============================================================================

-- Get the internal user_id from Firebase UID
-- This is used to map Firebase auth to our internal user
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT u.id
  FROM users u
  JOIN auth_identities ai ON ai.user_id = u.id
  WHERE ai.provider_uid = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get all agencies the current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_agencies()
RETURNS SETOF UUID AS $$
  SELECT au.agency_id
  FROM agency_users au
  WHERE au.user_id = public.get_current_user_id()
    AND au.is_active = true;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has a specific role in an agency
CREATE OR REPLACE FUNCTION public.has_agency_role(p_agency_id UUID, p_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM agency_users au
    WHERE au.agency_id = p_agency_id
      AND au.user_id = public.get_current_user_id()
      AND au.role = ANY(p_roles)
      AND au.is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin of an agency
CREATE OR REPLACE FUNCTION public.is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_agency_role(p_agency_id, ARRAY['agency_admin']);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user belongs to an agency
CREATE OR REPLACE FUNCTION public.belongs_to_agency(p_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM agency_users au
    WHERE au.agency_id = p_agency_id
      AND au.user_id = public.get_current_user_id()
      AND au.is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is account manager for a client
CREATE OR REPLACE FUNCTION public.is_account_manager_for_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM clients c
    WHERE c.id = p_client_id
      AND c.account_manager_id = public.get_current_user_id()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has access to a campaign
CREATE OR REPLACE FUNCTION public.has_campaign_access(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- Get the agency for this campaign
  SELECT get_agency_id_for_campaign(p_campaign_id) INTO v_agency_id;
  
  -- Agency admins have access to all campaigns
  IF public.is_agency_admin(v_agency_id) THEN
    RETURN true;
  END IF;
  
  -- Account managers have access to their clients' campaigns
  IF EXISTS (
    SELECT 1
    FROM campaigns cam
    JOIN projects p ON cam.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE cam.id = p_campaign_id
      AND c.account_manager_id = public.get_current_user_id()
  ) THEN
    RETURN true;
  END IF;
  
  -- Campaign-level assignment
  IF EXISTS (
    SELECT 1
    FROM campaign_users cu
    WHERE cu.campaign_id = p_campaign_id
      AND cu.user_id = public.get_current_user_id()
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- AGENCIES POLICIES
-- =============================================================================

-- Users can only see agencies they belong to
CREATE POLICY agencies_select ON agencies
  FOR SELECT
  USING (agencies.id IN (SELECT public.get_user_agencies()));

-- Only agency admins can update their agency
CREATE POLICY agencies_update ON agencies
  FOR UPDATE
  USING (public.is_agency_admin(agencies.id));

-- Agency creation is handled by service role (signup flow)
-- No direct insert policy for regular users

-- =============================================================================
-- USERS POLICIES
-- =============================================================================

-- Users can see other users in their agencies
CREATE POLICY users_select ON users
  FOR SELECT
  USING (
    users.id = public.get_current_user_id()
    OR EXISTS (
      SELECT 1 FROM agency_users au1
      JOIN agency_users au2 ON au1.agency_id = au2.agency_id
      WHERE au1.user_id = users.id
        AND au2.user_id = public.get_current_user_id()
        AND au1.is_active = true
        AND au2.is_active = true
    )
  );

-- Users can update their own profile
CREATE POLICY users_update ON users
  FOR UPDATE
  USING (users.id = public.get_current_user_id());

-- =============================================================================
-- AUTH IDENTITIES POLICIES
-- =============================================================================

-- Users can only see their own auth identities
CREATE POLICY auth_identities_select ON auth_identities
  FOR SELECT
  USING (auth_identities.user_id = public.get_current_user_id());

-- =============================================================================
-- AGENCY USERS POLICIES
-- =============================================================================

-- Users can see members of agencies they belong to
CREATE POLICY agency_users_select ON agency_users
  FOR SELECT
  USING (public.belongs_to_agency(agency_users.agency_id));

-- Only agency admins can manage agency users
CREATE POLICY agency_users_insert ON agency_users
  FOR INSERT
  WITH CHECK (public.is_agency_admin(agency_users.agency_id));

CREATE POLICY agency_users_update ON agency_users
  FOR UPDATE
  USING (public.is_agency_admin(agency_users.agency_id));

CREATE POLICY agency_users_delete ON agency_users
  FOR DELETE
  USING (public.is_agency_admin(agency_users.agency_id));

-- =============================================================================
-- CLIENTS POLICIES
-- =============================================================================

-- Users can see clients in their agencies
CREATE POLICY clients_select ON clients
  FOR SELECT
  USING (public.belongs_to_agency(clients.agency_id));

-- Agency admins and account managers can create clients
CREATE POLICY clients_insert ON clients
  FOR INSERT
  WITH CHECK (
    public.is_agency_admin(clients.agency_id)
    OR public.has_agency_role(clients.agency_id, ARRAY['account_manager'])
  );

-- Agency admins and the client's account manager can update
CREATE POLICY clients_update ON clients
  FOR UPDATE
  USING (
    public.is_agency_admin(clients.agency_id)
    OR clients.account_manager_id = public.get_current_user_id()
  );

-- =============================================================================
-- CLIENT USERS POLICIES
-- =============================================================================

-- Agency users can see client users for clients in their agency
CREATE POLICY client_users_select ON client_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_users.client_id
        AND public.belongs_to_agency(c.agency_id)
    )
  );

-- Account managers and agency admins can manage client users
CREATE POLICY client_users_insert ON client_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_users.client_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

CREATE POLICY client_users_update ON client_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_users.client_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- =============================================================================
-- PROJECTS POLICIES
-- =============================================================================

-- Users can see projects for clients in their agencies
CREATE POLICY projects_select ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = projects.client_id
        AND public.belongs_to_agency(c.agency_id)
    )
  );

-- Agency admins, account managers for the client can create projects
CREATE POLICY projects_insert ON projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = projects.client_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- Same for updates
CREATE POLICY projects_update ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = projects.client_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- =============================================================================
-- CAMPAIGNS POLICIES
-- =============================================================================

-- Users can see campaigns they have access to
CREATE POLICY campaigns_select ON campaigns
  FOR SELECT
  USING (public.has_campaign_access(campaigns.id));

-- Account managers and agency admins can create campaigns
CREATE POLICY campaigns_insert ON campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = campaigns.project_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- Campaign updates are restricted to admins, account managers, and operators
CREATE POLICY campaigns_update ON campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = campaigns.project_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
          OR EXISTS (
            SELECT 1 FROM campaign_users cu
            WHERE cu.campaign_id = campaigns.id
              AND cu.user_id = public.get_current_user_id()
              AND cu.role = 'operator'
          )
        )
    )
  );

-- =============================================================================
-- CAMPAIGN USERS POLICIES
-- =============================================================================

-- Users can see campaign_users for campaigns they can access
CREATE POLICY campaign_users_select ON campaign_users
  FOR SELECT
  USING (public.has_campaign_access(campaign_users.campaign_id));

-- Agency admins and account managers can manage campaign users
CREATE POLICY campaign_users_insert ON campaign_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns cam
      JOIN projects p ON cam.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE cam.id = campaign_users.campaign_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

CREATE POLICY campaign_users_update ON campaign_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns cam
      JOIN projects p ON cam.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE cam.id = campaign_users.campaign_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

CREATE POLICY campaign_users_delete ON campaign_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns cam
      JOIN projects p ON cam.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE cam.id = campaign_users.campaign_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- =============================================================================
-- DELIVERABLES POLICIES
-- =============================================================================

-- Users can see deliverables for campaigns they can access
CREATE POLICY deliverables_select ON deliverables
  FOR SELECT
  USING (public.has_campaign_access(deliverables.campaign_id));

-- Operators, account managers, and admins can create deliverables
CREATE POLICY deliverables_insert ON deliverables
  FOR INSERT
  WITH CHECK (public.has_campaign_access(deliverables.campaign_id));

-- Same for updates
CREATE POLICY deliverables_update ON deliverables
  FOR UPDATE
  USING (public.has_campaign_access(deliverables.campaign_id));

-- =============================================================================
-- DELIVERABLE VERSIONS POLICIES
-- =============================================================================

-- Users can see versions for deliverables they can access
CREATE POLICY deliverable_versions_select ON deliverable_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deliverables d
      WHERE d.id = deliverable_versions.deliverable_id
        AND public.has_campaign_access(d.campaign_id)
    )
  );

-- Users with campaign access can upload versions
CREATE POLICY deliverable_versions_insert ON deliverable_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliverables d
      WHERE d.id = deliverable_versions.deliverable_id
        AND public.has_campaign_access(d.campaign_id)
    )
  );

-- =============================================================================
-- APPROVALS POLICIES (APPEND-ONLY)
-- =============================================================================

-- Users can see approvals for deliverables they can access
CREATE POLICY approvals_select ON approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deliverables d
      WHERE d.id = approvals.deliverable_id
        AND public.has_campaign_access(d.campaign_id)
    )
  );

-- Internal approvers, account managers, admins can create approvals
-- Note: Client approvals are handled separately
CREATE POLICY approvals_insert ON approvals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliverables d
      WHERE d.id = approvals.deliverable_id
        AND public.has_campaign_access(d.campaign_id)
    )
  );

-- NO UPDATE OR DELETE POLICIES - Approvals are immutable

-- =============================================================================
-- CREATORS POLICIES
-- =============================================================================

-- Users can see creators in their agencies
CREATE POLICY creators_select ON creators
  FOR SELECT
  USING (public.belongs_to_agency(creators.agency_id));

-- Agency admins, account managers, operators can create creators
CREATE POLICY creators_insert ON creators
  FOR INSERT
  WITH CHECK (
    public.has_agency_role(creators.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
  );

-- Same for updates
CREATE POLICY creators_update ON creators
  FOR UPDATE
  USING (
    public.has_agency_role(creators.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
  );

-- =============================================================================
-- CAMPAIGN CREATORS POLICIES
-- =============================================================================

-- Users can see campaign creators for campaigns they can access
CREATE POLICY campaign_creators_select ON campaign_creators
  FOR SELECT
  USING (public.has_campaign_access(campaign_creators.campaign_id));

-- Users with campaign access can manage campaign creators
CREATE POLICY campaign_creators_insert ON campaign_creators
  FOR INSERT
  WITH CHECK (public.has_campaign_access(campaign_creators.campaign_id));

CREATE POLICY campaign_creators_update ON campaign_creators
  FOR UPDATE
  USING (public.has_campaign_access(campaign_creators.campaign_id));

-- =============================================================================
-- ANALYTICS SNAPSHOTS POLICIES (APPEND-ONLY)
-- =============================================================================

-- Users can see analytics for campaign creators they can access
CREATE POLICY creator_analytics_select ON creator_analytics_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_creators cc
      WHERE cc.id = creator_analytics_snapshots.campaign_creator_id
        AND public.has_campaign_access(cc.campaign_id)
    )
  );

-- Only service role should insert analytics (backend operation)
-- But allowing agency users for manual entry
CREATE POLICY creator_analytics_insert ON creator_analytics_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_creators cc
      WHERE cc.id = creator_analytics_snapshots.campaign_creator_id
        AND public.has_campaign_access(cc.campaign_id)
    )
  );

-- NO UPDATE OR DELETE - Analytics are immutable

-- Post metrics follow same pattern
CREATE POLICY post_metrics_select ON post_metrics_snapshots
  FOR SELECT
  USING (public.has_campaign_access(post_metrics_snapshots.campaign_id));

CREATE POLICY post_metrics_insert ON post_metrics_snapshots
  FOR INSERT
  WITH CHECK (public.has_campaign_access(post_metrics_snapshots.campaign_id));

-- NO UPDATE OR DELETE - Analytics are immutable

-- =============================================================================
-- PAYMENTS POLICIES
-- =============================================================================

-- Users can see payments for campaigns they can access
CREATE POLICY payments_select ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_creators cc
      WHERE cc.id = payments.campaign_creator_id
        AND public.has_campaign_access(cc.campaign_id)
    )
  );

-- Agency admins and account managers can create payments
CREATE POLICY payments_insert ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_creators cc
      JOIN campaigns cam ON cc.campaign_id = cam.id
      JOIN projects p ON cam.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE cc.id = payments.campaign_creator_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- Payment status updates (limited to marking as paid)
CREATE POLICY payments_update ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaign_creators cc
      JOIN campaigns cam ON cc.campaign_id = cam.id
      JOIN projects p ON cam.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE cc.id = payments.campaign_creator_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- =============================================================================
-- INVOICES POLICIES
-- =============================================================================

CREATE POLICY invoices_select ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments pay
      JOIN campaign_creators cc ON pay.campaign_creator_id = cc.id
      WHERE pay.id = invoices.payment_id
        AND public.has_campaign_access(cc.campaign_id)
    )
  );

CREATE POLICY invoices_insert ON invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments pay
      JOIN campaign_creators cc ON pay.campaign_creator_id = cc.id
      JOIN campaigns cam ON cc.campaign_id = cam.id
      JOIN projects p ON cam.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE pay.id = invoices.payment_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

-- =============================================================================
-- ACTIVITY LOGS POLICIES (APPEND-ONLY)
-- =============================================================================

-- Users can see activity logs for their agencies
CREATE POLICY activity_logs_select ON activity_logs
  FOR SELECT
  USING (public.belongs_to_agency(activity_logs.agency_id));

-- Only backend (service role) should insert logs
-- But allowing for API layer insertion
CREATE POLICY activity_logs_insert ON activity_logs
  FOR INSERT
  WITH CHECK (public.belongs_to_agency(activity_logs.agency_id));

-- NO UPDATE OR DELETE - Audit logs are immutable

-- =============================================================================
-- NOTIFICATIONS POLICIES
-- =============================================================================

-- Users can see their own notifications
CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (notifications.user_id = public.get_current_user_id());

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (notifications.user_id = public.get_current_user_id());

-- System/backend creates notifications (service role)
-- But allow for API layer insertion with agency check
CREATE POLICY notifications_insert ON notifications
  FOR INSERT
  WITH CHECK (
    notifications.user_id = public.get_current_user_id() 
    OR public.belongs_to_agency(notifications.agency_id)
  );

-- =============================================================================
-- SERVICE ROLE BYPASS
-- Note: Service role automatically bypasses RLS
-- Used for: User creation, agency creation, system operations
-- =============================================================================

-- =============================================================================
-- END OF RLS POLICIES
-- =============================================================================
