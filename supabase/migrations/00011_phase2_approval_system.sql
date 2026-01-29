-- =============================================================================
-- Phase 2: Approval System (Deliverable-Centric)
-- - Project approvers (optional stage: ANY ONE approval)
-- - Deliverable status: pending_project_approval
-- - Approval level: project (in addition to internal, client, final)
-- =============================================================================

-- 1. Project approvers (optional approval stage; ANY ONE approval sufficient)
CREATE TABLE project_approvers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_approvers_project_id ON project_approvers(project_id);
CREATE INDEX idx_project_approvers_user_id ON project_approvers(user_id);

COMMENT ON TABLE project_approvers IS 'Users who can approve deliverables at project level (optional stage); ANY ONE approval is sufficient.';

-- 2. Add pending_project_approval to deliverable status
ALTER TABLE deliverables
  DROP CONSTRAINT IF EXISTS deliverables_status_check;

ALTER TABLE deliverables
  ADD CONSTRAINT deliverables_status_check
  CHECK (status IN (
    'pending',
    'submitted',
    'internal_review',
    'pending_project_approval',
    'client_review',
    'approved',
    'rejected'
  ));

-- 3. Add 'project' to approval_level (campaign=internal, project=project, client=client)
ALTER TABLE approvals
  DROP CONSTRAINT IF EXISTS approvals_approval_level_check;

ALTER TABLE approvals
  ADD CONSTRAINT approvals_approval_level_check
  CHECK (approval_level IN ('internal', 'project', 'client', 'final'));

-- 4. RLS for project_approvers (uses existing helpers: belongs_to_agency, is_agency_admin, get_agency_id_for_project)
ALTER TABLE project_approvers ENABLE ROW LEVEL SECURITY;

-- Select: users who belong to the agency that owns the project
CREATE POLICY project_approvers_select ON project_approvers
  FOR SELECT
  USING (
    public.belongs_to_agency(public.get_agency_id_for_project(project_approvers.project_id))
  );

-- Insert/Update/Delete: agency admin or account manager of the project's client
CREATE POLICY project_approvers_insert ON project_approvers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = project_approvers.project_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

CREATE POLICY project_approvers_delete ON project_approvers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = project_approvers.project_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );
