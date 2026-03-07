-- Migration: Create project_notes table for project-level notes
-- Mirrors client_notes (migration 00037)

CREATE TABLE project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_notes_project ON project_notes(project_id);
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

-- RLS: agency members can read notes for their projects
CREATE POLICY "project_notes_select" ON project_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = project_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "project_notes_insert" ON project_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = project_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "project_notes_update" ON project_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = project_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );

CREATE POLICY "project_notes_delete" ON project_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = project_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
