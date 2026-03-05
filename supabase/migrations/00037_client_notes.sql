-- Migration: Create client_notes table for client-level notes log
-- Date: 2026-03-04

CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_client ON client_notes(client_id);
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- RLS: agency members can read notes for their clients
CREATE POLICY "client_notes_select" ON client_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = client_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "client_notes_insert" ON client_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = client_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "client_notes_update" ON client_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = client_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );

CREATE POLICY "client_notes_delete" ON client_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = client_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
