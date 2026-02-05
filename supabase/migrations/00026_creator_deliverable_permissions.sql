-- Creators can upload versions for their deliverables
CREATE POLICY deliverable_versions_creator_insert ON deliverable_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_versions.deliverable_id
        AND cr.user_id = public.get_current_user_id()
        AND d.status != 'approved' -- Can't upload to approved deliverables
    )
  );

-- Creators can view versions of their deliverables
CREATE POLICY deliverable_versions_creator_select ON deliverable_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_versions.deliverable_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Creators can update captions on their versions
CREATE POLICY deliverable_versions_creator_update ON deliverable_versions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_versions.deliverable_id
        AND cr.user_id = public.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_versions.deliverable_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Creators can view their assigned deliverables
CREATE POLICY deliverables_creator_select ON deliverables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM creators cr
      WHERE cr.id = deliverables.creator_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Creators can view campaigns they're assigned to (via campaign_creators)
CREATE POLICY campaigns_creator_select ON campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_creators cc
      JOIN creators cr ON cr.id = cc.creator_id
      WHERE cc.campaign_id = campaigns.id
        AND cr.user_id = public.get_current_user_id()
        AND cc.status IN ('accepted', 'invited')
    )
  );

-- Creators can view campaign_creators records they're part of
CREATE POLICY campaign_creators_creator_select ON campaign_creators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM creators cr
      WHERE cr.id = campaign_creators.creator_id
        AND cr.user_id = public.get_current_user_id()
    )
  );
