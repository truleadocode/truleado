-- Migration: Create contact_notes table for contact-level notes log
-- Date: 2026-03-04

CREATE TABLE contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_notes_contact ON contact_notes(contact_id);
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_notes_select" ON contact_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "contact_notes_insert" ON contact_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "contact_notes_update" ON contact_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );

CREATE POLICY "contact_notes_delete" ON contact_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
