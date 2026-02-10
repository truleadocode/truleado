-- Deliverable comments table for activity timeline messages
-- Following the pattern from proposal_notes (00027)

CREATE TABLE deliverable_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_by_type TEXT NOT NULL CHECK (created_by_type IN ('agency', 'creator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverable_comments_deliverable ON deliverable_comments(deliverable_id);
CREATE INDEX idx_deliverable_comments_created_at ON deliverable_comments(created_at DESC);

-- RLS Policies
ALTER TABLE deliverable_comments ENABLE ROW LEVEL SECURITY;

-- Agency users can view comments for their deliverables
CREATE POLICY deliverable_comments_agency_select ON deliverable_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN campaigns c ON c.id = d.campaign_id
      JOIN projects p ON p.id = c.project_id
      JOIN clients cl ON cl.id = p.client_id
      WHERE d.id = deliverable_comments.deliverable_id
        AND public.belongs_to_agency(cl.agency_id)
    )
  );

-- Creators can view comments for their own deliverables
CREATE POLICY deliverable_comments_creator_select ON deliverable_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_comments.deliverable_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Agency users can insert comments (admins, account managers, operators)
CREATE POLICY deliverable_comments_agency_insert ON deliverable_comments
  FOR INSERT
  WITH CHECK (
    created_by_type = 'agency' AND
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN campaigns c ON c.id = d.campaign_id
      JOIN projects p ON p.id = c.project_id
      JOIN clients cl ON cl.id = p.client_id
      WHERE d.id = deliverable_comments.deliverable_id
        AND public.has_agency_role(cl.agency_id, ARRAY['agency_admin', 'account_manager', 'operator'])
    )
  );

-- Creators can insert comments for their own deliverables
CREATE POLICY deliverable_comments_creator_insert ON deliverable_comments
  FOR INSERT
  WITH CHECK (
    created_by_type = 'creator' AND
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_comments.deliverable_id
        AND cr.user_id = public.get_current_user_id()
    )
  );
