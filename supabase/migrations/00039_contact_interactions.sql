-- Migration: Create contact_interactions table for interaction tracking
-- Date: 2026-03-04

CREATE TABLE contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_date ON contact_interactions(contact_id, interaction_date DESC);
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_interactions_select" ON contact_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_interactions.agency_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "contact_interactions_insert" ON contact_interactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_interactions.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "contact_interactions_update" ON contact_interactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_interactions.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );

CREATE POLICY "contact_interactions_delete" ON contact_interactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_interactions.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
