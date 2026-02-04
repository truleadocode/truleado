-- Creator rates per deliverable type
CREATE TABLE IF NOT EXISTS creator_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  deliverable_type TEXT NOT NULL,
  rate_amount NUMERIC(10, 2) NOT NULL,
  rate_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_rates_creator_id ON creator_rates(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_rates_platform ON creator_rates(platform);

CREATE TRIGGER update_creator_rates_updated_at
  BEFORE UPDATE ON creator_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE creator_rates ENABLE ROW LEVEL SECURITY;

-- Users can see creator rates in their agencies
CREATE POLICY creator_rates_select ON creator_rates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM creators c
      WHERE c.id = creator_rates.creator_id
        AND public.belongs_to_agency(c.agency_id)
    )
  );

-- Agency admins, account managers, operators can manage creator rates
CREATE POLICY creator_rates_insert ON creator_rates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM creators c
      WHERE c.id = creator_rates.creator_id
        AND public.has_agency_role(c.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
    )
  );

CREATE POLICY creator_rates_update ON creator_rates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM creators c
      WHERE c.id = creator_rates.creator_id
        AND public.has_agency_role(c.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
    )
  );

CREATE POLICY creator_rates_delete ON creator_rates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM creators c
      WHERE c.id = creator_rates.creator_id
        AND public.has_agency_role(c.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
    )
  );
