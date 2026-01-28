-- Migration: Add brief field to campaigns and create campaign_attachments table
-- Date: 2026-01-28

-- Add brief column to campaigns table (rich text content)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brief TEXT;

-- Create campaign_attachments table
CREATE TABLE IF NOT EXISTS campaign_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_attachments_campaign 
  ON campaign_attachments(campaign_id);

-- Enable RLS on campaign_attachments
ALTER TABLE campaign_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_attachments
CREATE POLICY "campaign_attachments_select" ON campaign_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN projects p ON c.project_id = p.id
      JOIN clients cl ON p.client_id = cl.id
      JOIN agency_users au ON cl.agency_id = au.agency_id
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE c.id = campaign_attachments.campaign_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "campaign_attachments_insert" ON campaign_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN projects p ON c.project_id = p.id
      JOIN clients cl ON p.client_id = cl.id
      JOIN agency_users au ON cl.agency_id = au.agency_id
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE c.id = campaign_attachments.campaign_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "campaign_attachments_delete" ON campaign_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN projects p ON c.project_id = p.id
      JOIN clients cl ON p.client_id = cl.id
      JOIN agency_users au ON cl.agency_id = au.agency_id
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE c.id = campaign_attachments.campaign_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
