-- Migration: Create campaign_promo_codes table
-- Stores promo codes assigned to campaigns, optionally linked to creators

CREATE TABLE campaign_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_promo_codes_campaign ON campaign_promo_codes(campaign_id);
ALTER TABLE campaign_promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS: agency members can access promo codes via campaign → project → client → agency chain
CREATE POLICY "campaign_promo_codes_select" ON campaign_promo_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN projects p ON c.project_id = p.id
      JOIN clients cl ON p.client_id = cl.id
      JOIN agency_users au ON au.agency_id = cl.agency_id
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE c.id = campaign_promo_codes.campaign_id
        AND ai.provider_uid = auth.uid()::text
    )
  );

CREATE POLICY "campaign_promo_codes_insert" ON campaign_promo_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN projects p ON c.project_id = p.id
      JOIN clients cl ON p.client_id = cl.id
      JOIN agency_users au ON au.agency_id = cl.agency_id
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE c.id = campaign_promo_codes.campaign_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager', 'operator')
    )
  );

CREATE POLICY "campaign_promo_codes_delete" ON campaign_promo_codes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN projects p ON c.project_id = p.id
      JOIN clients cl ON p.client_id = cl.id
      JOIN agency_users au ON au.agency_id = cl.agency_id
      JOIN auth_identities ai ON au.user_id = ai.user_id
      WHERE c.id = campaign_promo_codes.campaign_id
        AND ai.provider_uid = auth.uid()::text
        AND au.role IN ('agency_admin', 'account_manager')
    )
  );
