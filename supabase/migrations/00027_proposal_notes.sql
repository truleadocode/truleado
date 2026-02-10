-- Proposal notes table for timeline messages
CREATE TABLE proposal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_by_type TEXT NOT NULL CHECK (created_by_type IN ('agency', 'creator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_notes_campaign_creator ON proposal_notes(campaign_creator_id);
CREATE INDEX idx_proposal_notes_created_at ON proposal_notes(created_at DESC);

-- RLS Policies
ALTER TABLE proposal_notes ENABLE ROW LEVEL SECURITY;

-- Agency users can view notes for their campaigns
CREATE POLICY proposal_notes_agency_select ON proposal_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN campaigns c ON c.id = cc.campaign_id
      JOIN projects p ON p.id = c.project_id
      JOIN clients cl ON cl.id = p.client_id
      WHERE cc.id = proposal_notes.campaign_creator_id
        AND public.belongs_to_agency(cl.agency_id)
    )
  );

-- Creators can view notes for their own proposals
CREATE POLICY proposal_notes_creator_select ON proposal_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN creators cr ON cr.id = cc.creator_id
      WHERE cc.id = proposal_notes.campaign_creator_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Agency users can insert notes
CREATE POLICY proposal_notes_agency_insert ON proposal_notes
  FOR INSERT
  WITH CHECK (
    created_by_type = 'agency' AND
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN campaigns c ON c.id = cc.campaign_id
      JOIN projects p ON p.id = c.project_id
      JOIN clients cl ON cl.id = p.client_id
      WHERE cc.id = proposal_notes.campaign_creator_id
        AND public.has_agency_role(cl.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
    )
  );

-- Creators can insert notes for their own proposals
CREATE POLICY proposal_notes_creator_insert ON proposal_notes
  FOR INSERT
  WITH CHECK (
    created_by_type = 'creator' AND
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN creators cr ON cr.id = cc.creator_id
      WHERE cc.id = proposal_notes.campaign_creator_id
        AND cr.user_id = public.get_current_user_id()
    )
  );
