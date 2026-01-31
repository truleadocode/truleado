-- =============================================================================
-- RBAC: Project-level operator assignment
-- Operators are assigned to projects; they see all campaigns under that project.
-- campaign_users remains for overrides only (approvers, viewers, exceptions).
-- =============================================================================

-- 1. Project users (operator assignment at project level)
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);

COMMENT ON TABLE project_users IS 'Operators assigned to a project; they get access to all campaigns under this project. Primary assignment path for operators.';

-- 2. RLS for project_users
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Select: users who belong to the agency that owns the project
CREATE POLICY project_users_select ON project_users
  FOR SELECT
  USING (
    public.belongs_to_agency(public.get_agency_id_for_project(project_users.project_id))
  );

-- Insert/Update/Delete: agency admin or account manager of the project's client
CREATE POLICY project_users_insert ON project_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = project_users.project_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );

CREATE POLICY project_users_delete ON project_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = project_users.project_id
        AND (
          public.is_agency_admin(c.agency_id)
          OR c.account_manager_id = public.get_current_user_id()
        )
    )
  );
