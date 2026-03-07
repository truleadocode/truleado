-- Migration: Create campaign_notes table for campaign-level notes
-- Mirrors project_notes (migration 00043) with added note_type field

CREATE TABLE campaign_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_notes_campaign ON campaign_notes(campaign_id);
ALTER TABLE campaign_notes ENABLE ROW LEVEL SECURITY;

-- RLS: agency members can read notes for their campaigns
CREATE POLICY "campaign_notes_select" ON campaign_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = campaign_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "campaign_notes_insert" ON campaign_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = campaign_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "campaign_notes_update" ON campaign_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = campaign_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );

CREATE POLICY "campaign_notes_delete" ON campaign_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = campaign_notes.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
