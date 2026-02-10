-- Creators can insert tracking records for their deliverables
CREATE POLICY deliverable_tracking_records_creator_insert ON deliverable_tracking_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_tracking_records.deliverable_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Creators can insert tracking URLs for their tracking records
CREATE POLICY deliverable_tracking_urls_creator_insert ON deliverable_tracking_urls
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM deliverable_tracking_records dtr
      JOIN deliverables d ON d.id = dtr.deliverable_id
      JOIN creators cr ON cr.id = d.creator_id
      WHERE dtr.id = deliverable_tracking_urls.tracking_record_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

-- Creators can view tracking for their deliverables
CREATE POLICY deliverable_tracking_records_creator_select ON deliverable_tracking_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN creators cr ON cr.id = d.creator_id
      WHERE d.id = deliverable_tracking_records.deliverable_id
        AND cr.user_id = public.get_current_user_id()
    )
  );

CREATE POLICY deliverable_tracking_urls_creator_select ON deliverable_tracking_urls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliverable_tracking_records dtr
      JOIN deliverables d ON d.id = dtr.deliverable_id
      JOIN creators cr ON cr.id = d.creator_id
      WHERE dtr.id = deliverable_tracking_urls.tracking_record_id
        AND cr.user_id = public.get_current_user_id()
    )
  );
