-- Proposal state enum
CREATE TYPE proposal_state AS ENUM (
  'draft',
  'sent',
  'countered',
  'accepted',
  'rejected'
);

-- Append-only proposal versions table
CREATE TABLE proposal_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  state proposal_state NOT NULL,

  -- Proposal terms
  rate_amount NUMERIC(10, 2),
  rate_currency TEXT DEFAULT 'USD',
  deliverable_scopes JSONB, -- Array of {deliverableType, quantity, notes}
  notes TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_by_type TEXT NOT NULL CHECK (created_by_type IN ('agency', 'creator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (campaign_creator_id, version_number)
);

CREATE INDEX idx_proposal_versions_campaign_creator ON proposal_versions(campaign_creator_id);
CREATE INDEX idx_proposal_versions_state ON proposal_versions(state);
CREATE INDEX idx_proposal_versions_created_at ON proposal_versions(created_at DESC);

-- Denormalize current proposal state on campaign_creators for fast access
ALTER TABLE campaign_creators ADD COLUMN proposal_state proposal_state DEFAULT 'draft';
ALTER TABLE campaign_creators ADD COLUMN current_proposal_version INTEGER;
ALTER TABLE campaign_creators ADD COLUMN proposal_accepted_at TIMESTAMPTZ;

-- Trigger to sync proposal_state from latest version
CREATE OR REPLACE FUNCTION sync_proposal_state()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaign_creators
  SET proposal_state = NEW.state,
      current_proposal_version = NEW.version_number,
      proposal_accepted_at = CASE
        WHEN NEW.state = 'accepted' THEN NEW.created_at
        ELSE proposal_accepted_at
      END
  WHERE id = NEW.campaign_creator_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_proposal_state_trigger
  AFTER INSERT ON proposal_versions
  FOR EACH ROW EXECUTE FUNCTION sync_proposal_state();

-- RLS Policies for proposal_versions
ALTER TABLE proposal_versions ENABLE ROW LEVEL SECURITY;

-- Agency users can view proposals in their agency
CREATE POLICY proposal_versions_agency_select ON proposal_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN campaigns c ON c.id = cc.campaign_id
      JOIN projects p ON p.id = c.project_id
      JOIN clients cl ON cl.id = p.client_id
      WHERE cc.id = proposal_versions.campaign_creator_id
        AND public.belongs_to_agency(cl.agency_id)
    )
  );

-- Creators can view their own proposals
CREATE POLICY proposal_versions_creator_select ON proposal_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN creators cr ON cr.id = cc.creator_id
      WHERE cc.id = proposal_versions.campaign_creator_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Agency users can insert proposals
CREATE POLICY proposal_versions_agency_insert ON proposal_versions
  FOR INSERT
  WITH CHECK (
    created_by_type = 'agency' AND
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN campaigns c ON c.id = cc.campaign_id
      JOIN projects p ON p.id = c.project_id
      JOIN clients cl ON cl.id = p.client_id
      WHERE cc.id = proposal_versions.campaign_creator_id
        AND public.has_agency_role(cl.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
    )
  );

-- Creators can insert counter-proposals
CREATE POLICY proposal_versions_creator_insert ON proposal_versions
  FOR INSERT
  WITH CHECK (
    created_by_type = 'creator' AND
    state = 'countered' AND
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN creators cr ON cr.id = cc.creator_id
      WHERE cc.id = proposal_versions.campaign_creator_id
        AND cr.user_id = public.get_current_user_id()
    )
  );
