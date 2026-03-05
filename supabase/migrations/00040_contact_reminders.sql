-- Migration: Create contact_reminders table for contact reminders
-- Date: 2026-03-04

CREATE TABLE contact_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'manual',
  reminder_date DATE NOT NULL,
  note TEXT,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_reminders_contact ON contact_reminders(contact_id);
CREATE INDEX idx_contact_reminders_active ON contact_reminders(reminder_date) WHERE NOT is_dismissed;
ALTER TABLE contact_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_reminders_select" ON contact_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_reminders.agency_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "contact_reminders_insert" ON contact_reminders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_reminders.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "contact_reminders_update" ON contact_reminders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_reminders.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );

CREATE POLICY "contact_reminders_delete" ON contact_reminders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE au.agency_id = contact_reminders.agency_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
